import fastify from "fastify";
import '../controllers/UserController';
import { server } from '../app';
import { CreateUser } from "../controllers/UserController";

server.post("/users", CreateUser);

