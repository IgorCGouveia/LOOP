import { FastifyInstance } from "fastify";
import Login from "../controllers/indexController";

const LoginControl = new Login();

export async function LoginRoute(server: FastifyInstance){



    server.post("/login", LoginControl.login);


    
}