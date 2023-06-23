// Constantes que exigem a instalação das dependências para o node funcionar 
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

//Constante que define o local onde está o banco de dados
const DBPATH = './backend/database/dbPanpedia.db';

//Decodifica os dados e permite com que o servidor leia, deixando de ter %20 para espaços, por exemplo.
const urlencodedParser = bodyParser.urlencoded({ extended: false });

//Define uma constante router, a qual serve para definir que é um objeto do tipo router. Possui funcionamento similar ao de um app, porém com a diferença
//que pode ser exportado 
const router = express.Router();

//Tela de Tickets
router.get('/', (req, res) => {
    //Verifica se o usuário está logado
    if (req.session.autenticado) {
        var titulo = "Tickets";
        var icone = "/public/assets/logoPanpediaReduzida.svg";
        //Garantir que a requisição tem código inicial correto
        res.statusCode = 200;
        //Define o cabeçalho da requisição
        res.setHeader('Acess-Control-Allow-Origin', '*');
        //Inicializa o banco de dados
        var db = new sqlite3.Database(DBPATH); 
        //Comando sql a ser executado
        if (req.session.acesso == 0) {
            var sql = `SELECT * FROM Tickets WHERE ID_USER = ${req.session.id_user}`;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    //Joga o erro pro console, impedindo acontecer um travamento geral
                    throw err;
                }
                //Renderiza a página de resultados, passando de parâmetro o resultado da busca no banco de dados
                res.render("index/tickets", {tickets:rows, title: titulo, iconeTitulo: icone });
            });
            db.close();
        }
        else if(req.session.acesso == 1){
            var sql = `SELECT * FROM Tickets` 
            db.all(sql, [], (err, rows) => {
                if (err) {
                    //Joga o erro pro console, impedindo acontecer um travamento geral
                    throw err;
                }
                console.log(rows);
                //Renderiza a página de resultados, passando de parâmetro o resultado da busca no banco de dados
                res.render("index/ticketGov", {tickets:rows, title: titulo, iconeTitulo: icone });
            });
            db.close();   
        }
    }
    //Redireciona o usuário para a página de login, caso ele não esteja logado
    else {
        res.redirect("/");
    }
})

router.post("/criar-ticket", urlencodedParser,(req, res) => {
        //Verifica se o usuário está logado
        if (req.session.autenticado) {
            //Garantir que a requisição tem código inicial correto
            res.statusCode = 200;
            //Define o cabeçalho da requisição
            res.setHeader('Acess-Control-Allow-Origin', '*');
            //Inicializa o banco de dados
            var db = new sqlite3.Database(DBPATH); 
            //Comando sql a ser executado
            //Parâmetros de filtros passados na requisição de uma pesquisa
            console.log(req.body);
            console.log(req.query);
            var database    = req.body.formDb;
            var idTabela    = req.body.formId;
            var caminho     = req.body.formCa;
            var id          = req.body.formTa;
            var sql = `INSERT INTO Tickets (ID_TABELA,ID_USER,STATUS,APROVADO,DATABASE,TABELA,CAMINHO) VALUES ("${id}",${req.session.id_user},0,0,"${database}","${idTabela}","${caminho}")`;
            console.log(sql)

            db.all(sql,[],(err,rows)=>{
                if (err) {
                    //Joga o erro pro console, impedindo acontecer um travamento geral
                    throw err;
                }
                db.close();
            });
}});

router.get("/modal-tickets", urlencodedParser,(req, res) => {
    //Verifica se o usuário está logado
    if (req.session.autenticado) {
        if(req.session.acesso==1){
            //ID do ticket vindo
            var id = req.query.id_ticket;
            //Garantir que a requisição tem código inicial correto
            res.statusCode = 200;
            //Define o cabeçalho da requisição
            res.setHeader('Acess-Control-Allow-Origin', '*');
            //Inicializa o banco de dados
            var db = new sqlite3.Database(DBPATH); 
            //Comando sql a ser executado
            var sql = `SELECT * FROM Tickets WHERE ID_TICKET = ${id}`;
            db.all(sql,[],(err,rows)=>{
                if (err) {
                    //Joga o erro pro console, impedindo acontecer um travamento geral
                    throw err;
                }
                res.json(rows);
            });
            db.close();
        }
    }
});

router.get("/status", urlencodedParser,(req, res) => {
    //Verifica se o usuário está logado
    if (req.session.autenticado) {
        if(req.session.acesso==1){
            var id = req.query.id_ticket;
            var status = req.query.status;
            var aprovado = ""
            if(req.query.aprovado != undefined){
                aprovado = `, APROVADO = ${req.query.aprovado}`;
            }
            //Garantir que a requisição tem código inicial correto
            res.statusCode = 200;
            //Define o cabeçalho da requisição
            res.setHeader('Acess-Control-Allow-Origin', '*');
            //Inicializa o banco de dados
            var db = new sqlite3.Database(DBPATH); 
            //Comando sql a ser executado
            
            var sql = `UPDATE Tickets SET STATUS = ${status} ${aprovado}  WHERE ID_TICKET = ${id}`;
            console.log(sql)
            db.all(sql,[],(err,rows)=>{
                if (err) {
                    //Joga o erro pro console, impedindo acontecer um travamento geral
                    throw err;
                }
                if(status == 2 && req.query.aprovado == 1){
                    var sqlTicket = `SELECT * FROM Tickets WHERE ID_TICKET = ${id}`;
                    db.all(sqlTicket,[],(err,rows)=>{
                        if (err) {
                            //Joga o erro pro console, impedindo acontecer um travamento geral
                            throw err;
                        }
                        var atualizar = `UPDATE Catalogo_Dados_Tabelas SET DATABASE = "${rows[0].DATABASE}", TABELA = "${rows[0].TABELA}", CAMINHO = "${rows[0].CAMINHO}"   WHERE ID ="${rows[0].ID_TABELA}"`
                        console.log(atualizar);
                        db.run(atualizar,[],err=>{
                            if (err) {
                                //Joga o erro pro console, impedindo acontecer um travamento geral
                                throw err;
                            }  
                            res.redirect("/tickets");
                            db.close();
                        })
                    })
                }else{
                res.redirect("/tickets");
                db.close();}
            });
        }
}});

router.get("/aprovado",urlencodedParser, (req, res) => {
    //Verifica se o usuário está logado
    if (req.session.autenticado) {
        if(req.session.id_user==1){
            var id = req.query.id_ticket;
            var aprovado = req.query.aprovado;
            //Garantir que a requisição tem código inicial correto
            res.statusCode = 200;
            //Define o cabeçalho da requisição
            res.setHeader('Acess-Control-Allow-Origin', '*');
            //Inicializa o banco de dados
            var db = new sqlite3.Database(DBPATH); 
            //Comando sql a ser executado
            var sql = `UPDATE Tickets SET APROVADO = ${aprovado} WHERE ID_TICKET = ${id}`;
            db.all(sql,[],(err)=>{
                if (err) {
                    //Joga o erro pro console, impedindo acontecer um travamento geral
                    throw err;
                }
                var sqlTicket = `SELECT * FROM Tickets WHERE ID_TICKET = ${id}`;
                db.all(sqlTicket,[],(err,rows)=>{
                    if (err) {
                        //Joga o erro pro console, impedindo acontecer um travamento geral
                        throw err;
                    }
                    var atualizar = `UPDATE Catalogo_Dados_Tabelas SET DATABASE = "${rows[0].DATABASE}", TABELA = "${rows[0].TABELA}", CAMINHO = "${rows[0].CAMINHO}"`
                    db.run(atualizar,[],err=>{
                        if (err) {
                            //Joga o erro pro console, impedindo acontecer um travamento geral
                            throw err;
                        }  
                        res.redirect("/ticket");
                        db.close();
                    })
                })
            });
            db.close();
        }
    }
});

module.exports = router;