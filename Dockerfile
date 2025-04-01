FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm config set legacy-peer-deps true
# Temel paketleri kur
RUN npm install express pg drizzle-orm
# React ve ilgili paketleri kur
RUN npm install react react-dom react-router-dom
# UI paketlerini kur
RUN npm install @radix-ui/react-* lucide-react tailwind-merge
# Kalan paketleri kur
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]