FROM node:21-bullseye-slim

ENV NODE_ENV=${NODE_ENV}
ENV HOST=${HOST}
ENV PORT=${PORT}

ENV MONGO_CONNECTION=${MONGO_CONNECTION}

WORKDIR /

COPY package*.json ./
COPY . .

RUN npm install
RUN npm run build

EXPOSE ${PORT}

CMD ["npm", "start"]