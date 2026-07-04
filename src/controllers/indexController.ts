import { FastifyReply, FastifyRequest } from "fastify";
import { Logar} from "../services/indexService"

export default class Login{
    async login(req: FastifyRequest, res:FastifyReply){
        const {email,password} = req.body as {email: string, password: string}
        if(!email || !password){
            return res.status(400).send("Campos não preenchidos.");
        }
        const token = await Logar(email, password);

        return res.status(200).send(token);
    }
}
