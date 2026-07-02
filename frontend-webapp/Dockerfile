FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# package-lock.json is present; legacy peer resolution is still required by
# current React 19-era dependencies.
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
