FROM node:16-alpine

WORKDIR /opt/participant/

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

CMD ["yarn",  "start"]
