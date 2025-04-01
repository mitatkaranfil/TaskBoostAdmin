FROM node:20-alpine

WORKDIR /app

# Yarn kurulumu
RUN apk add --no-cache yarn

# Sadece package.json dosyasını kopyala
COPY package.json ./

# Yarn ile paketleri kur
RUN yarn install

# Tüm projeyi kopyala
COPY . .

# Build işlemini yap
RUN yarn build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]