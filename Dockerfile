FROM node:24-alpine
ENV NODE_ENV=production TZ=America/Phoenix DATA_DIR=/data PORT=8210
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
VOLUME /data
EXPOSE 8210
CMD ["node", "server.js"]
