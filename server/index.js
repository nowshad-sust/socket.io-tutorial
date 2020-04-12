const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const { addUser, removeUser, getUserById, getRoomUsers } = require("./users");

const port = 4000;
const app = express();

app.use(cors());

const httpServer = http.createServer(app);
const io = socketIO(httpServer);

app.get("/", (req, res) => res.send("Hello World!"));

io.on("connection", (socket) => {
	console.log("a user connected ", socket.id);

	socket.on("join", ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });
		if (error) {
			callback(error);
		}

		socket.join(room);
		socket.emit("message", {
			user: "System",
			text: `welcome ${name} to ${room}.`,
		});

		socket.broadcast.to(room).emit("message", {
			user: "System",
			text: `${name} just joined ${room}.`,
		});

		const roomUsers = getRoomUsers(room);
		io.to(room).emit("userList", { roomUsers });

		callback();
	});

	socket.on("message", (message) => {
		const user = getUserById(socket.id);

		io.to(user.room).emit("message", {
			user: user.name,
			text: message,
		});
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit("message", {
				user: "System",
				text: `${user.name} just left ${user.room}.`,
			});

			const roomUsers = getRoomUsers(user.room);
			io.to(user.room).emit("userList", { roomUsers });
		}
	});
});

httpServer.listen(port, () =>
	console.log(`Example app listening at http://localhost:${port}`)
);
