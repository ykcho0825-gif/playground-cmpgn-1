FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public
COPY data ./data
COPY cmpgn_tmp_*.csv cmpgn_popup_tmp_*.csv cmpgn_copn_tmp_*.csv ./
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV APP_PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

USER node
CMD ["node", "server.js"]
