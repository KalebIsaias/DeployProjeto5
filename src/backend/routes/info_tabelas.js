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

//Requisição feita para pesquisar uma tabela do banco, utilizando de informações enviadas pelo usuário na hora da pesquisa
router.get('/pesquisa', urlencodedParser, (req, res) => {
    //Verifica se o usuário está logado
    if (req.session.autenticado) {
        var titulo = "Pesquisa";
        var icone = "/public/assets/logoPanpediaReduzida.svg";
        //Garantir que a requisição tem código inicial correto
        res.statusCode = 200;
        //Parâmetros de filtros passados na requisição de uma pesquisa
        var categoria   = req.query.formCat;
        var database    = req.query.formDb;
        var owner       = req.query.formOwn;
        var criticidade = req.query.formCri;
        var pesquisa    = req.query.pesquisa;
        var pagina = parseInt(req.query.formPage);
        //Variável para passar os valores que foram pesquisados, utilizado o nome de search para não confundir com a variável de search
        var search = `pesquisa=${pesquisa}&formCat=${categoria}&formDb=${database}&formOwn=${owner}&formCri=${criticidade}`

        //console.log('Valores dos filtros:', categoria, database, owner, criticidade);

        //Define o cabeçalho da requisição
        res.setHeader('Access-Control-Allow-Origin', '*')
        //Inicializa o banco de dados
        var db = new sqlite3.Database(DBPATH);
        //Varíavel para a definição da sentença SQl
        var sql = `SELECT * FROM Catalogo_Dados_Tabelas LEFT JOIN Catalogo_Dados_Variaveis
        ON Catalogo_Dados_Variaveis.ID_VARIAVEL = Catalogo_Dados_Tabelas.ID 
        WHERE (Catalogo_Dados_Tabelas.ID LIKE "%${pesquisa}%" 
        OR Catalogo_Dados_Tabelas.CONTEUDO_TABELA LIKE "%${pesquisa}%"  
        OR  Catalogo_Dados_Variaveis.DESCRICAO_CAMPO LIKE "%${pesquisa}%"
        OR Catalogo_Dados_Variaveis.NOME_CAMPO LIKE "%${pesquisa}%")`;
        //Variável para armazenar filtros
        var auxiliar = ""

        //Verifica se foram passados parâmetros de filtros e em caso positivo, adiciona-os a sentença sql
        if (categoria != undefined && categoria !== '') { auxiliar += ` AND Catalogo_Dados_Tabelas.CONJUNTODADOS_PRODUTO = "${categoria}" ` }

        if (database != undefined && database !== '') { auxiliar += ` AND Catalogo_Dados_Tabelas.DATABASE = "${database}" ` }

        if (owner != undefined && owner !== '') { auxiliar += ` AND Catalogo_Dados_Tabelas.OWNER = "${owner}" ` }

        if (criticidade != undefined && criticidade !== '') { auxiliar += ` AND Catalogo_Dados_Tabelas.CRITICIDADE_TABELA = "${criticidade}" ` }

        //Constante query, a qual conta no banco quantas tabelas a pesquisa realizada terá
        const countQuery = `SELECT COUNT(*) AS total
        FROM (
            SELECT Catalogo_Dados_Tabelas.ID
            FROM Catalogo_Dados_Tabelas
            LEFT JOIN Catalogo_Dados_Variaveis ON Catalogo_Dados_Variaveis.ID_VARIAVEL = Catalogo_Dados_Tabelas.ID
            WHERE (Catalogo_Dados_Tabelas.ID LIKE '%${pesquisa}%'
                OR Catalogo_Dados_Tabelas.CONTEUDO_TABELA LIKE '%${pesquisa}%'
                OR Catalogo_Dados_Variaveis.DESCRICAO_CAMPO LIKE '%${pesquisa}%'
                OR Catalogo_Dados_Variaveis.NOME_CAMPO LIKE '%${pesquisa}%')${auxiliar} 
            GROUP BY Catalogo_Dados_Tabelas.ID
        ) AS subquery;`;
        //console.log(countQuery);
        db.get(countQuery, [], (err, total ) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }
            const totalPages = Math.floor(total.total / 10)+1;
            
            let offset = (pagina-1)*10;
            let max = 10;
            sql += auxiliar + ` GROUP BY Catalogo_Dados_Tabelas.ID COLLATE NOCASE ORDER BY Catalogo_Dados_Tabelas.RANK_GOV LIMIT ${max} OFFSET ${offset}`
            //console.log(sql);
            db.all(sql, [], (err, rows) => {
            if (err) {
                //Joga o erro pro console, impedindo acontecer um travamento geral
                throw err;
            }
            //Renderiza a página de resultados, passando de parâmetro o resultado da busca no banco de dados
            //console.log(rows);
            res.render("tabelas/resultado", { pesquisa: pesquisa, tabelas: rows, title: titulo, iconeTitulo: icone, total:totalPages, atual:pagina, search:search, idPasta: req.session.id_pasta});
            });
        })
        db.close();
    }
    //Redireciona o usuário para a página de login, caso ele não esteja logado
    else {
        res.redirect("/");
    }
});

//Requisição para realizar alteração na tabela de Catalogo_Dados_Tabelas
router.get('/atualizar-tabelas', (req, res) => {
    //Garantir que a requisição tem código inicial correto
    res.statusCode = 200;
    //Define o cabeçalho da requisição
    res.setHeader('Acess-Control-Allow-Origin', '*');
    //Inicializa o banco de dados
    var db = new sqlite3.Database(DBPATH);
    //Varíavel para a definição da sentença SQl
    var sql = `SELECT * FROM Catalogo_Dados_Tabelas WHERE ID = "` + req.query.id + `"`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
    res.write("Mudança com sucesso!");
    db.close();
});

//Requisição para realizar alteração na tabela de Catalogo_Dados_Tabelass
router.post('/atualizar-tabelas', urlencodedParser, (req, res) => {
    //Garantir que a requisição tem código inicial correto
    res.statusCode = 200;
    //Define o cabeçalho da requisição
    res.setHeader('Acess-Control-Allow-Origin', '*');
    //Inicializa o banco de dados
    var db = new sqlite3.Database(DBPATH);
    //Varíavel para a definição da sentença SQl
    sql = `UPDATE Catalogo_Dados_Tabelas SET CONJUNTODADOS_PRODUTO = "` + req.body.conjunto + `", ID_TABELA = "` + req.body.id_tabela + `", TABELA ="` + req.body.tabela + `", CONTEUDO_TABELA ="` + req.body.descricao + `", CRITICIDADE_TABELA = "` + req.body.criticidade + `",  DADOS_SENSIVEIS ="` + req.body.dados_sensiveis + `", DEFASAGEM ="` + req.body.defasagem + `", DATABASE ="` +
        req.body.database + `", CAMINHO ="` + req.body.caminho + `", SCRIPTS_ALIMENTACAO ="` + req.body.script + `", ENG_INGESTAO = "` + req.body.eng + `", OWNER ="` + req.body.owner + `", STEWARD ="` + req.body.steward + `", INDICADORAJUSTENOMENCLATURATABELA ="` + req.body.ajuste + `" WHERE ID ="` + req.body.ID + `"`;
    //console.log(sql);
    db.all(sql, [], err => {
        if (err) {
            throw err;
        }
    });
    //Mostra na tela que foi atualizado com sucesso
    res.write('<p>Tabela Atualizada com sucesso!</p>');
    res.end();
    db.close(); // Fecha o banco
});

//Rota responsável por pegar as informações de uma tabela, e renderizar a página de uma tabela específica
router.get('/informacoes', (req, res) => {
    //Verifica se o usuário está logado
    if (req.session.autenticado) {
        //Variáveis que permitem com que a página tenha um nome e ícone
        var titulo = "Tabela";
        var icone = "/public/assets/logoPanpediaReduzida.svg";
        //Garantir que a requisição tem código inicial correto
        res.statusCode = 200;
        //Define o cabeçalho da requisição
        res.setHeader('Acess-Control-Allow-Origin', '*');
        //Inicializa o banco de dados
        var db = new sqlite3.Database(DBPATH);
        //Varíavel para a definição da sentença SQl
        var sql = `SELECT * FROM Catalogo_Dados_Tabelas
        LEFT JOIN Catalogo_Dados_Variaveis
        ON Catalogo_Dados_Tabelas.ID = Catalogo_Dados_Variaveis.ID_VARIAVEL
        LEFT JOIN Catalogo_Dados_Conexoes
        ON Catalogo_Dados_Tabelas.ID = Catalogo_Dados_Conexoes.ID
        WHERE Catalogo_Dados_Tabelas.ID = "`+ req.query.id_tabela + `";`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                throw err;
            }
            //Renderiza a página visualização, passando de parâmetro o resultado da busca no banco de dados, assim como informações pertinentes para o funcionamento da página
            res.render("tabelas/visualizacao", { tabela: rows, title: titulo, iconeTitulo: icone, idPasta: req.session.id_pasta});
        });
        db.close();
    }
    //Redireciona o usuário para a página de login, caso ele não esteja logado
    else {
        res.redirect("/");
    }
});

//Serve para importar todos os endpoints realizados para o arquivo 
module.exports = router;
