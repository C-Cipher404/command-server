const WebSocket = require("ws");
const fs = require("fs");

const wss = new WebSocket.Server({ port: 8080 });
const adminPassword = "supersecretpw";
const clients = new Map();

function log(message) {
  fs.appendFileSync("server.log", message + "\n");
}

function broadcast(message, exclude) {
  clients.forEach((_, client) => {
    if (client !== exclude) client.send(message);
  });
}

wss.on("connection", (ws) => {
  const username = `Guest${clients.size + 1}`;
  clients.set(ws, username);
  log(`${username} connected`);
  broadcast(`${username} joined the chat`, ws);

  ws.on("message", (msg) => {
    const message = msg.toString().trim();
    log(`[${clients.get(ws)}]: ${message}`);

    if (message.startsWith("/")) {
      const [cmd, arg1, arg2] = message.split(" ");
      const currentUser = clients.get(ws);

      if (cmd === "/w") {
        const recipient = [...clients.entries()].find(
          ([_, name]) => name === arg1
        );
        if (!recipient || !arg2 || recipient[0] === ws) {
          ws.send("Error: Invalid whisper command");
        } else {
          recipient[0].send(`Whisper from ${currentUser}: ${arg2}`);
          ws.send(`You whispered to ${arg1}: ${arg2}`);
        }
      } else if (cmd === "/username") {
        if (
          !arg1 ||
          arg1 === currentUser ||
          [...clients.values()].includes(arg1)
        ) {
          ws.send("Error: Invalid or duplicate username");
        } else {
          clients.set(ws, arg1);
          broadcast(`${currentUser} is now ${arg1}`);
          ws.send(`Your username is updated to ${arg1}`);
        }
      } else if (cmd === "/kick") {
        const target = [...clients.entries()].find(
          ([_, name]) => name === arg1
        );
        if (!target || arg1 === currentUser || arg2 !== adminPassword) {
          ws.send("Error: Invalid kick command");
        } else {
          target[0].send("You have been kicked from the chat");
          target[0].close();
          clients.delete(target[0]);
          broadcast(`${arg1} was kicked from the chat`);
        }
      } else if (cmd === "/clientlist") {
        ws.send("Connected clients: " + [...clients.values()].join(", "));
      } else {
        ws.send("Error: Unknown command");
      }
    } else {
      broadcast(`[${clients.get(ws)}]: ${message}`, ws);
    }
  });

  ws.on("close", () => {
    const name = clients.get(ws);
    clients.delete(ws);
    broadcast(`${name} left the chat`);
    log(`${name} disconnected`);
  });
});

console.log("WebSocket server is running on ws://localhost:8080");
