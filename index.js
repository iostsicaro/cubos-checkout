const express = require('express');
const {listarProdutos, listarCarrinho, adcionarProdutoNoCarrinho, alterarQuantidade, deletarProduto, limparCarrinho, finalizarCarrinho} = require('./controladores/controladores.js');

const app = express();  
app.use(express.json());

app.get('/produtos', listarProdutos);
app.get('/carrinho', listarCarrinho);
app.post('/carrinho/produtos', adcionarProdutoNoCarrinho);
app.patch('/carrinho/:idConsultado', alterarQuantidade);
app.delete('/carrinho/:idProduto', deletarProduto);
app.delete('/carrinho', limparCarrinho);
app.post('/finalizar-compra', finalizarCarrinho);

app.listen(8000);