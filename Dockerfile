FROM node:20-alpine AS base
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/c1aytonnet/family-meal-planner"

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN mkdir -p /saved-data
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/saved-data

EXPOSE 3000

CMD ["npm", "run", "start"]
