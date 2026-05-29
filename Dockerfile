# Development image for the React application
FROM node:22.22.1

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install && yarn cache clean

COPY . .

EXPOSE 3000

CMD ["yarn", "dev", "--host", "0.0.0.0"]
