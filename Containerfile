FROM docker.io/library/node:24-bookworm

RUN apt update \
    && apt -y upgrade \
    && apt -y full-upgrade \
    && apt-get -y autoremove \
    && apt-get -y autoclean \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@11.5.1

RUN mkdir /app \
    && cd /app \
    && wget https://github.com/stevieraykatz/HexPad/archive/refs/heads/main.zip \
    && unzip main.zip \
    && rm main.zip \
    && cd HexPad-main \
    && npm install

CMD cd /app/HexPad-main && npm run dev
