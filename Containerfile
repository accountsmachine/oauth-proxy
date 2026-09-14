FROM python:3.12-slim

RUN pip install --no-cache-dir gnucash-uk-vat

EXPOSE 8080

CMD ["vat-oauth-proxy"]
