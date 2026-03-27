from telethon import TelegramClient

api_id = '38428766'
api_hash = 'b22851c1a46e029f4bb51e9c3105dc10'

client = TelegramClient('session', api_id, api_hash)

async def main():
    async for dialog in client.iter_dialogs():
        print(dialog.name, dialog.id)

with client:
    client.loop.run_until_complete(main())