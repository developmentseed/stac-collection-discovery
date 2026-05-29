# Development image for the React application
FROM node:24.15.0

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install && yarn cache clean

COPY . .

EXPOSE 3000

CMD ["yarn", "dev", "--host", "0.0.0.0"]
