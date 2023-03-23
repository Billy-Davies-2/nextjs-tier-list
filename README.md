# nextjs-tier-list

The goal of this project is to learn about the new **app** dir in Next13, and also to play around with a small SQLite Database (Pocketbase)

## Installation

### Clone the repo

```bash
git clone https://github.com/Billy-Davies-2/nextjs-tier-list.git

cd nextjs-tier-list
```

### Pocketbase

Download Pocketbase from [pocketbase.io](https://pocketbase.io/)

Place it in the project dir, extract the ZIP file

Thats it!

## Starting the app

### Start Pocketbase

```bash
./pocketbase serve
```
Log into the admin console on [http://localhost:8090/_/](http://localhost:8090/_/)

### Start Next.js server

```bash
npx run dev
```

You should be able to navigate to **http://localhost:3000** and start seeing content!

## TODO

- [ ] Serve HTTPS for pocketbase
- [ ] Learn and implement TailwindCSS
- [ ] Tidy up model to support multiple users
- [ ] Look into other cool things I'd like to integrate with Next.js
