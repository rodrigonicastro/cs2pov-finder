import asyncio
import os
import smtplib
from concurrent.futures import ThreadPoolExecutor
from email.mime.text import MIMEText

_pool = ThreadPoolExecutor(max_workers=2)


def send_sync(to: str, subject: str, body: str, html: bool = False) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    from_addr = os.environ.get("SMTP_FROM", user)
    msg = MIMEText(body, "html" if html else "plain")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    with smtplib.SMTP(host, port) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.sendmail(from_addr, [to], msg.as_string())


async def send(to: str, subject: str, body: str, html: bool = False) -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_pool, send_sync, to, subject, body, html)
