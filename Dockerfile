FROM node:20.19 AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate
COPY . .
RUN npm run build

# Runtime stage
FROM node:20.19 AS runtime
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --only=production
RUN npx prisma generate
COPY --from=build /app/dist ./dist
# ⭐ QUAN TRỌNG: Copy thư mục assets từ stage build
COPY --from=build /app/src/assets ./src/assets

ENV PORT=8082
ENV NODE_ENV=production

EXPOSE 8082

CMD ["node", "dist/src/main.js"]