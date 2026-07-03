import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function getLabel(table: string, code: string | null): Promise<string> {
  if (!code) return '-';
  const { data, error } = await supabaseAdmin.from(table).select('label').eq('code', code).maybeSingle();
  if (error || !data) return code;
  return data.label as string;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const formatPriceDB = (val: number | null) => {
      if (val === null || val === undefined) return null;
      return val >= 1000 ? val / 4000 : val;
    };

    // 1. Handle Photo Uploads
    const photoUrls: string[] = [];
    if (data.photoBase64s && Array.isArray(data.photoBase64s)) {
      for (let i = 0; i < data.photoBase64s.length; i++) {
        try {
          const base64Data = data.photoBase64s[i].replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          // Organize photos into folders by Brand and Date for easier management
          let dateStr = new Date().toISOString().split('T')[0];
          if (data.submission_date) {
            dateStr = String(data.submission_date).replace(/[^a-zA-Z0-9-]/g, '_');
          }
          const brandFolder = data.brand_code ? String(data.brand_code).replace(/[^a-zA-Z0-9_-]/g, '') : 'Unknown_Brand';
          
          const fileName = `${brandFolder}/${dateStr}/photo_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('photos')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: false
            });
            
          if (uploadData && !uploadError) {
            const { data: publicUrlData } = supabaseAdmin.storage.from('photos').getPublicUrl(fileName);
            photoUrls.push(publicUrlData.publicUrl);
          } else if (uploadError) {
            console.error("Supabase Storage Error:", uploadError);
          }
        } catch (err) {
          console.error("Photo base64 parsing error:", err);
        }
      }
    }

    const photoUrlString = photoUrls.length > 0 ? photoUrls.join(',') : null;

    let finalTypeSelect = data.type_select_code || null;
    if (!finalTypeSelect) {
      const { data: fallbackType } = await supabaseAdmin.from('type_selects').select('code').limit(1).maybeSingle();
      if (fallbackType) {
        finalTypeSelect = fallbackType.code;
      }
    }

    // 2. Insert into Supabase using Admin client to bypass RLS
    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('submissions')
      .insert([
        {
          submitted_by: data.submitted_by || "Unknown",
          submission_date: data.submission_date,
          region_code: data.region_code || null,
          dealer_code: data.dealer_code || null,
          province_code: data.province_code || null,
          district_code: data.district_code || null,
          commune: data.commune || null,
          village: data.village || null,
          brand_code: data.brand_code || null,
          channel_code: data.channel_code || null,
          sub_channel_code: data.sub_channel_code || null,
          price_source_code: data.price_source_code || null,
          type_select_code: finalTypeSelect,
          scheme: data.scheme || null,
          basic_price: formatPriceDB(data.basic_price),
          net_price: formatPriceDB(data.net_price),
          sellout_price_seller: formatPriceDB(data.sellout_price_seller),
          sellout_price_consumer: formatPriceDB(data.sellout_price_consumer),
          sellout_price_consumer_can: formatPriceDB(data.sellout_price_consumer_can),
          note: data.note || null,
          lat: data.lat,
          lng: data.lng,
          photo_url: photoUrlString,
          notification_status: 'pending',
        }
      ])
      .select('id')
      .single();

    if (dbError) {
      console.error('Supabase Insert Error:', dbError);
      return NextResponse.json(
        { error: 'Failed to insert data into the database.', details: dbError },
        { status: 500 }
      );
    }

    const submissionId = insertedData.id;

    // 3. Fetch labels to construct Telegram message
    const [
      typeLabel,
      regionLabel,
      dealerLabel,
      provinceLabel,
      districtLabel,
      brandLabel,
      channelLabel,
      subChannelLabel,
      priceSourceLabel,
    ] = await Promise.all([
      getLabel('type_selects', data.type_select_code),
      getLabel('regions', data.region_code),
      getLabel('dealers', data.dealer_code),
      getLabel('provinces', data.province_code),
      getLabel('districts', data.district_code),
      getLabel('brands', data.brand_code),
      getLabel('channels', data.channel_code),
      getLabel('sub_channels', data.sub_channel_code),
      getLabel('price_sources', data.price_source_code),
    ]);

    const mapUrl =
      data.lat !== null && data.lng !== null
        ? `<a href="http://maps.google.com/maps?q=${data.lat},${data.lng}">Open Google Maps</a>`
        : '-';

    const formatCurrencyDisplay = (val: number | null) => {
      if (val === null || val === undefined || isNaN(val)) return '-';
      return val >= 1000 ? `${val}៛` : `$${val}`;
    };

    const parseScheme = (schemeString: string | null) => {
      if (!schemeString) return { sNum: 0, fNum: 0 };
      const match = schemeString.match(/^(\d+)\s*\+\s*(.+)$/);
      if (match) {
        const sNum = Number(match[1]);
        const fMatch = match[2].match(/^(\d+)/);
        const fNum = fMatch ? Number(fMatch[1]) : 0;
        return { sNum, fNum };
      }
      return { sNum: 0, fNum: 0 };
    };

    const { sNum, fNum } = parseScheme(data.scheme);
    let computedNetPrice = data.net_price;
    if (!computedNetPrice && data.basic_price && sNum > 0 && fNum > 0) {
      computedNetPrice = Number(((Number(data.basic_price) * sNum) / (sNum + fNum)).toFixed(2));
    } else if (!computedNetPrice && data.basic_price) {
      computedNetPrice = data.basic_price;
    }

    const lines = [
      `<b>Submitted by:</b> ${data.submitted_by}`,
      '',
      `<b>Promotion of:</b> ${brandLabel} ${typeLabel}`,
      `<b>Region:</b> ${regionLabel}`,
      `<b>Dealer:</b> ${dealerLabel}`,
      `<b>Location:</b> ${data.village ? data.village + ', ' : ''}${data.commune ? data.commune + ', ' : ''}${districtLabel}, ${provinceLabel}`,
      `<b>Location Map:</b> ${mapUrl}`,
      `<b>Channel:</b> ${channelLabel}${data.sub_channel_code ? ` (${subChannelLabel})` : ''}`,
      `<b>Scheme:</b> ${data.scheme ?? '-'}`,
      `• <b>Basic Price:</b> ${formatCurrencyDisplay(data.basic_price)} (From ${priceSourceLabel})`,
      `• <b>Net Price:</b> ${formatCurrencyDisplay(computedNetPrice)}`,
      `• <b>Sell Out Price to seller (អ្នកលក់):</b> ${formatCurrencyDisplay(data.sellout_price_seller)}`,
      `• <b>Sell Out Price to consumer Per Ctn (អ្នកផឹកក្នុងមួយកេស):</b> ${formatCurrencyDisplay(data.sellout_price_consumer)}`,
      `• <b>Sell Out Price to consumer Per Can (អ្នកផឹកក្នុងមួយកំប៉ុង):</b> ${formatCurrencyDisplay(data.sellout_price_consumer_can)}`,
      `<b>Date:</b> ${data.submission_date}`,
      `<b>Note:</b> ${data.note ?? '-'}`
    ];

    const messageText = lines.join('\n');

    // 4. Send direct to Telegram API
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramBotToken && telegramChatId) {
      try {
        let telegramEndpoint = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        let payload: any = {
          chat_id: telegramChatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        };

        if (photoUrls.length === 1) {
          telegramEndpoint = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;
          payload = {
            chat_id: telegramChatId,
            photo: photoUrls[0],
            caption: messageText,
            parse_mode: 'HTML',
          };
        } else if (photoUrls.length > 1) {
          telegramEndpoint = `https://api.telegram.org/bot${telegramBotToken}/sendMediaGroup`;
          payload = {
            chat_id: telegramChatId,
            media: photoUrls.map((url, i) => {
              if (i === 0) {
                return {
                  type: 'photo',
                  media: url,
                  caption: messageText,
                  parse_mode: 'HTML',
                };
              }
              return {
                type: 'photo',
                media: url,
              };
            }),
          };
        }

        const telegramResponse = await fetch(telegramEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!telegramResponse.ok) {
          const telegramError = await telegramResponse.text();
          console.error('Telegram send failed:', telegramError);
          // If the media group caption is too long (error 400), we could fallback to sending text separately, 
          // but our text is ~500 chars, well below the 1024 limit.
          await supabaseAdmin
            .from('submissions')
            .update({ notification_status: 'failed', notification_error: telegramError })
            .eq('id', submissionId);
        } else {
          // Success
          await supabaseAdmin
            .from('submissions')
            .update({ notification_status: 'sent', notification_error: null })
            .eq('id', submissionId);
        }
      } catch (tgError: any) {
        console.error('Failed to call Telegram API:', tgError);
        await supabaseAdmin
          .from('submissions')
          .update({ notification_status: 'failed', notification_error: String(tgError) })
          .eq('id', submissionId);
      }
    } else {
      console.warn('Telegram Bot Token or Chat ID not configured.');
    }

    return NextResponse.json({ success: true, id: submissionId });
  } catch (error: any) {
    console.error('Unexpected API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
}
