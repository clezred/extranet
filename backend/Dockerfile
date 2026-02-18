FROM node:18
WORKDIR /app
COPY package*.json ./
RUN touch extranet.db
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "src/backend.js"]