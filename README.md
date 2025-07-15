# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deploying to Your Own Server

Deploying a Next.js application to your own server (like a VPS) involves a few key steps. Here is a general guide to get you started.

### Prerequisites

*   A server with shell access (SSH).
*   Node.js (version 20.x or later recommended) and npm installed on the server.
*   A tool to copy files to your server (like `scp` or `rsync`).

### 1. Build the Project

First, you need to create a production-ready build of your application. This command compiles your code and optimizes it for performance.

```bash
npm run build
```

This will create a `.next` directory in your project folder. This is the main folder you need to run the application, along with `public`, `package.json`, and `node_modules`.

### 2. Prepare Your Server

On your server, create a directory for your app:

```bash
mkdir ~/my-pharmacy-app
cd ~/my-pharmacy-app
```

### 3. Copy Files to the Server

Copy the necessary files and folders from your local machine to the server. You'll need:
- The `.next` folder
- The `public` folder
- `package.json`
- `package-lock.json`

You can use a command like `scp` to do this:

```bash
# From your local machine
scp -r .next public package.json package-lock.json user@your_server_ip:~/my-pharmacy-app/
```

### 4. Install Production Dependencies

On your server, navigate to your app directory and install only the production dependencies listed in `package.json`.

```bash
cd ~/my-pharmacy-app
npm install --production
```

### 5. Set Environment Variables

Your application relies on environment variables (like `GOOGLE_MAPS_API_KEY`). Create a `.env.local` file on your server to store them.

```bash
# On the server, inside ~/my-pharmacy-app
nano .env.local
```

Add your variables to this file:

```
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY
# Add any other variables here
```

**Important:** Never commit your `.env.local` file to version control.

### 6. Run the Application with a Process Manager

It's highly recommended to use a process manager like `pm2` to keep your application running permanently and restart it automatically if it crashes.

First, install `pm2` globally:
```bash
npm install pm2 -g
```

Then, start your Next.js application with `pm2`:
```bash
pm2 start npm --name "pharmacy-app" -- start
```

This command tells `pm2` to run the `start` script from your `package.json`.

You can check the status of your app with `pm2 list` and view logs with `pm2 logs pharmacy-app`.

Your app is now running, typically on port 3000. You could access it at `http://your_server_ip:3000`. For a professional setup, you'll want to use a reverse proxy.

### 7. (Recommended) Set Up a Reverse Proxy

A reverse proxy like Nginx or Caddy is a web server that sits in front of your Next.js app. It can handle incoming traffic on standard ports (80 for HTTP, 443 for HTTPS) and forward it to your app running on port 3000. It can also manage SSL certificates for HTTPS, which is crucial for security.

Configuring Nginx is a more advanced topic, but it is the standard way to deploy Node.js applications in production.
