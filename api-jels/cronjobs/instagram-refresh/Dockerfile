# Cron container para renovação do token do Instagram
# Executa toda segunda-feira às 01:00
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir httpx python-dotenv psycopg

COPY cronjobs/instagram-refresh/crontab /etc/cron.d/instagram-refresh
RUN sed -i 's/\r$//' /etc/cron.d/instagram-refresh && \
    crontab /etc/cron.d/instagram-refresh && \
    touch /var/log/cron.log

COPY cronjobs/instagram-refresh/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
