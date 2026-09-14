FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libc6-dev && \
    pip install --no-cache-dir gnucash-uk-vat && \
    apt-get purge -y gcc libc6-dev && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 8080

CMD ["vat-oauth-proxy"]
