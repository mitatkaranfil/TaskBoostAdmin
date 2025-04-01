FROM node:18-alpine

WORKDIR /app

COPY package.json ./

# Önce prodüksiyon paketlerini kuralım
RUN npm install --only=production --no-package-lock

# Sonra dev bağımlılıklarını kuralım
RUN npm install --only=dev --no-package-lock

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]


