const axios = require('axios');
const fs = require('fs/promises');
const addBusinessDay = require('date-fns/addBusinessDays')

// GET produtos

async function listarProdutos(req, res) {
    const categoria = req.query.categoria;
    const precoInicial = req.query.precoInicial;
    const precoFinal = req.query.precoFinal;

    let produtos = JSON.parse(await fs.readFile('./dados/data.json'));
    let arrayProdutos = produtos.produtos;

    if (!categoria && !precoInicial && !precoFinal) {
        const produtosComEstoque = arrayProdutos.filter(product => product.estoque > 0);

        res.status(200);
        res.json(produtosComEstoque);
        return;
    }

    if (categoria && precoInicial && precoFinal) {
        const produtosComEstoque = arrayProdutos.filter(product => {
            if (product.estoque > 0 && product.categoria == categoria && product.preco >= precoInicial && product.preco <= precoFinal) {
                return true
            }
        });

        res.status(200);
        res.json(produtosComEstoque);
        return;
    }

    if (categoria) {
        const categoriaComEstoque = arrayProdutos.filter(product => {
            if (product.estoque > 0 && product.categoria == categoria) {
                return true;
            }
        });

        res.status(200);
        res.json(categoriaComEstoque);
        return;
    }

    if (precoInicial && precoFinal) {
        const faixaPrecoComEstoque = arrayProdutos.filter(product => {
            if (product.estoque > 0 && product.preco >= precoInicial && product.preco <= precoFinal) {
                return true
            }
        });

        res.status(200);
        res.json(faixaPrecoComEstoque);
        return;
    }
};

// GET carrinhos

async function listarCarrinho(req, res) {
    let carrinhoFinal = JSON.parse(await fs.readFile('./dados/carrinhoFinal.json'));

    if (carrinhoFinal.subtotal == 0) {
        res.status(200);
        res.json(carrinhoFinal);
        return;
    }

    if (carrinhoFinal.subtotal > 0) {
        res.status(200);
        res.json(carrinhoFinal);
        return;
    }
};

// POST carrinhos

async function adcionarProdutoNoCarrinho(req, res) {
    const id = Number(req.body.id), quantidade = Number(req.body.quantidade);

    // leitura arquivo data.json
    let produtos = JSON.parse(await fs.readFile('./dados/data.json'));

    // leitura arquivo carrinhoFinal.json, contendo dados do carrinho
    let carrinhoFinal = JSON.parse(await fs.readFile('./dados/carrinhoFinal.json'));

    const produto = produtos.produtos.find(product => {
        if (product.id == id) {
            return true;
        } else {
            return false;
        }
    });


    if (!produto || quantidade == 0) {
        res.status(400);
        res.json({ mensagem: "É preciso passar id e quantidade do produto!" });
        return;
    };

    if (produto.estoque == 0 || quantidade > produto.estoque) {
        res.status(404);
        res.json({ mensagem: "Esse produto não tem estoque suficiente!" });
        return;
    };

    let novoProduto = {
        id: produto.id,
        quantidade: quantidade,
        nome: produto.nome,
        preco: produto.preco,
        categoria: produto.categoria
    };

    if (carrinhoFinal.subtotal === 0) {
        let date = new Date();

        carrinhoFinal.valorDoFrete = 5000;
        carrinhoFinal.subtotal = (produto.preco * quantidade);
        carrinhoFinal.totalAPagar = carrinhoFinal.subtotal + carrinhoFinal.valorDoFrete;
        carrinhoFinal.dataDeEntrega = addBusinessDay(date, 15);
        carrinhoFinal.produtos.push(novoProduto)

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(carrinhoFinal);
        return;
    };

    let valorLimite = produto.estoque
    let arrayProduct = carrinhoFinal.produtos;
    let encontrarNoCarrinho = arrayProduct.find(product => product.id == produto.id);

    if (!encontrarNoCarrinho && (carrinhoFinal.subtotal + (produto.preco * quantidade)) <= 20000) {
        carrinhoFinal.valorDoFrete = 5000;
        carrinhoFinal.subtotal = carrinhoFinal.subtotal + (produto.preco * quantidade);
        carrinhoFinal.totalAPagar = carrinhoFinal.totalAPagar + carrinhoFinal.subtotal;
        carrinhoFinal.produtos.push(novoProduto)

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(carrinhoFinal);
        return;
    }

    if (!encontrarNoCarrinho && (carrinhoFinal.subtotal + (produto.preco * quantidade)) > 20000) {
        carrinhoFinal.valorDoFrete = 0;
        carrinhoFinal.subtotal = carrinhoFinal.subtotal + (produto.preco * quantidade);
        carrinhoFinal.totalAPagar = carrinhoFinal.totalAPagar + carrinhoFinal.subtotal;
        carrinhoFinal.produtos.push(novoProduto)

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(carrinhoFinal);
        return;
    }

    if (encontrarNoCarrinho && valorLimite >= (encontrarNoCarrinho.quantidade + quantidade) && (carrinhoFinal.subtotal + (produto.preco * quantidade)) <= 20000) {
        encontrarNoCarrinho.quantidade = encontrarNoCarrinho.quantidade + quantidade;

        carrinhoFinal.subtotal = carrinhoFinal.subtotal + (produto.preco * quantidade);

        carrinhoFinal.totalAPagar = carrinhoFinal.totalAPagar + carrinhoFinal.subtotal;

        carrinhoFinal.valorDoFrete = 5000;

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(carrinhoFinal);
        return;
    }

    if (encontrarNoCarrinho && valorLimite >= (encontrarNoCarrinho.quantidade + quantidade) && (carrinhoFinal.subtotal + (produto.preco * quantidade)) > 20000) {
        encontrarNoCarrinho.quantidade = encontrarNoCarrinho.quantidade + quantidade;

        carrinhoFinal.subtotal = carrinhoFinal.subtotal + (produto.preco * quantidade);

        carrinhoFinal.totalAPagar = carrinhoFinal.totalAPagar + carrinhoFinal.subtotal;

        carrinhoFinal.valorDoFrete = 0;

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(carrinhoFinal);
        return;
    };

    if (valorLimite < (encontrarNoCarrinho.quantidade + quantidade)) {
        encontrarNoCarrinho.quantidade = encontrarNoCarrinho.quantidade + quantidade;
        res.status(404);
        res.json({ mensagem: "Esse produto não tem estoque suficiente!" });
        return;
    };
};

// PATCH carrinhos

async function alterarQuantidade(req, res) {
    const id = Number(req.params.idConsultado), quantidade = Number(req.body.quantidade);

    // leitura arquivo data.json
    let produtos = JSON.parse(await fs.readFile('./dados/data.json'));

    // leitura arquivo carrinhoFinal.json, contendo dados do carrinho
    let carrinhoFinal = JSON.parse(await fs.readFile('./dados/carrinhoFinal.json'));

    let arrayProduct = carrinhoFinal.produtos;
    let encontrarNoCarrinho = arrayProduct.find(product => product.id == id);


    if (!encontrarNoCarrinho) {
        res.status(404);
        res.json({ mensagem: "Esse produto não está no carrinho!" });
        return;
    };

    let produtoData = produtos.produtos.find(product => {
        if (product.id == encontrarNoCarrinho.id) {
            return true;
        } else {
            return false;
        }
    });

    if (encontrarNoCarrinho.id && quantidade > produtoData.estoque) {
        res.status(404);
        res.json({ mensagem: "Esse produto não tem estoque suficiente!" });
        return;
    };

    let valorLimite = produtoData.estoque;

    if (encontrarNoCarrinho && (quantidade > 0)) {
        encontrarNoCarrinho.quantidade = encontrarNoCarrinho.quantidade + quantidade;

        carrinhoFinal.subtotal = carrinhoFinal.subtotal + (produtoData.preco * quantidade);

        if (valorLimite < encontrarNoCarrinho.quantidade) {
            res.status(404);
            res.json({ mensagem: "Esse produto não tem estoque suficiente!" });
            return;
        }

        if (valorLimite >= encontrarNoCarrinho.quantidade && carrinhoFinal.subtotal <= 20000) {
            carrinhoFinal.totalAPagar = carrinhoFinal.subtotal + 5000;

            fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

            res.status(200);
            res.json(carrinhoFinal);
            return;
        }

        if (valorLimite >= encontrarNoCarrinho.quantidade && carrinhoFinal.subtotal > 20000) {
            carrinhoFinal.valorDoFrete = 0;
            carrinhoFinal.totalAPagar = carrinhoFinal.subtotal;

            fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

            res.status(200);
            res.json(carrinhoFinal);
            return;
        }
    }

    if (encontrarNoCarrinho && (quantidade < 0)) {
        encontrarNoCarrinho.quantidade = encontrarNoCarrinho.quantidade - Math.abs(quantidade);

        carrinhoFinal.subtotal = carrinhoFinal.subtotal - Math.abs(produtoData.preco * quantidade);

        if (valorLimite < encontrarNoCarrinho.quantidade) {
            res.status(404);
            res.json({ mensagem: "Esse produto não tem estoque suficiente!" });
            return;
        }

        if (valorLimite >= encontrarNoCarrinho.quantidade && carrinhoFinal.subtotal <= 20000) {
            carrinhoFinal.totalAPagar = carrinhoFinal.subtotal + 5000;

            if (encontrarNoCarrinho.quantidade == 0 || encontrarNoCarrinho.quantidade < 0) {
                let indiceProduto = arrayProduct.indexOf(encontrarNoCarrinho);

                carrinhoFinal.produtos.splice(indiceProduto, 1);

                if (arrayProduct.length == 0) {
                    carrinhoFinal.valorDoFrete = 0;
                    carrinhoFinal.subtotal = 0;
                    carrinhoFinal.totalAPagar = 0;
                    carrinhoFinal.dataDeEntrega = null;
                    carrinhoFinal.produtos = [];

                    fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                    res.status(200);
                    res.json(carrinhoFinal);

                    return;
                }

                fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                res.status(200);
                res.json(carrinhoFinal);
                return;
            } else {
                fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                res.status(200);
                res.json(carrinhoFinal);
                return;
            }
        }

        if (valorLimite >= encontrarNoCarrinho.quantidade && carrinhoFinal.subtotal > 20000) {
            carrinhoFinal.valorDoFrete = 0;
            carrinhoFinal.totalAPagar = carrinhoFinal.subtotal;

            if (encontrarNoCarrinho.quantidade == 0 || encontrarNoCarrinho.quantidade < 0) {
                let indiceProduto = arrayProduct.indexOf(encontrarNoCarrinho);

                carrinhoFinal.produtos.splice(indiceProduto, 1);

                if (arrayProduct.length == 0) {
                    carrinhoFinal.valorDoFrete = 0;
                    carrinhoFinal.subtotal = 0;
                    carrinhoFinal.totalAPagar = 0;
                    carrinhoFinal.dataDeEntrega = null;
                    carrinhoFinal.produtos = [];

                    fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                    res.status(200);
                    res.json(carrinhoFinal);

                    return;
                }

                fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                res.status(200);
                res.json(carrinhoFinal);
                return;
            }

            if (encontrarNoCarrinho.quantidade == 0 || encontrarNoCarrinho.quantidade < 0 && arrayProduct.length == 0) {
                let indiceProduto = arrayProduct.indexOf(encontrarNoCarrinho);

                carrinhoFinal.produtos.splice(indiceProduto, 1);

                if (arrayProduct.length == 0) {
                    carrinhoFinal.valorDoFrete = 0;
                    carrinhoFinal.subtotal = 0;
                    carrinhoFinal.totalAPagar = 0;
                    carrinhoFinal.dataDeEntrega = null;
                    carrinhoFinal.produtos = [];

                    fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                    res.status(200);
                    res.json(carrinhoFinal);

                    return;
                }

                fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

                res.status(200);
                res.json(carrinhoFinal);
                return;
            }

            fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

            res.status(200);
            res.json(carrinhoFinal);
            return;

        }
    }


}

async function deletarProduto(req, res) {
    const id = Number(req.params.idProduto);

    // leitura arquivo carrinhoFinal.json, contendo dados do carrinho
    let carrinhoFinal = JSON.parse(await fs.readFile('./dados/carrinhoFinal.json'));

    let arrayProduct = carrinhoFinal.produtos;
    let encontrarNoCarrinho = arrayProduct.find(product => product.id == id);

    if (!encontrarNoCarrinho) {
        res.status(404);
        res.json({ mensagem: "Esse produto não está no carrinho!" });
        return;
    };

    if (encontrarNoCarrinho) {
        let indiceProduto = arrayProduct.indexOf(encontrarNoCarrinho);

        carrinhoFinal.produtos.splice(indiceProduto, 1);

        if (arrayProduct.length == 0) {
            carrinhoFinal.valorDoFrete = 0;
            carrinhoFinal.subtotal = 0;
            carrinhoFinal.totalAPagar = 0;
            carrinhoFinal.dataDeEntrega = null;
            carrinhoFinal.produtos = [];

            fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));
            return;
        }

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(carrinhoFinal);
        return;
    };
}

async function limparCarrinho(req, res) {
    // leitura arquivo carrinhoFinal.json, contendo dados do carrinho
    let carrinhoFinal = JSON.parse(await fs.readFile('./dados/carrinhoFinal.json'));

    carrinhoFinal.valorDoFrete = 0;
    carrinhoFinal.subtotal = 0;
    carrinhoFinal.totalAPagar = 0;
    carrinhoFinal.dataDeEntrega = null;
    carrinhoFinal.produtos = [];

    fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

    res.status(200);
    res.json(carrinhoFinal);
    return;
}

async function finalizarCarrinho(req, res) {
    const pais = req.body.country, nome = req.body.name, tipoFisico = req.body.type
    const { type, number } = req.body.documents[0], cpf = "cpf"

    // leitura arquivo data.json
    let produtos = JSON.parse(await fs.readFile('./dados/data.json'));

    // leitura arquivo carrinhoFinal.json, contendo dados do carrinho
    let carrinhoFinal = JSON.parse(await fs.readFile('./dados/carrinhoFinal.json'));

    // leitura arquivo carrinhoFinal.json, contendo dados do cliente
    let dadosCliente = JSON.parse(await fs.readFile('./dados/carrinhoDados.json'));

    let arrayProdutosJson = produtos.produtos;
    let arrayProductCarrinho = carrinhoFinal.produtos;

    if (arrayProductCarrinho.length == 0) {
        res.status(404);
        res.json({ mensagem: "O carrinho está vazio!" });
        return;
    }

    if (tipoFisico !== "individual" || tipoFisico == undefined) {
        res.status(404);
        res.json({ mensagem: "Verifique os dados do usuário!" });
        return;
    }

    if (pais.length < 2 || pais == undefined) {
        res.status(404);
        res.json({ mensagem: "Verifique os dados do usuário!" });
        return;
    }

    if (nome.length < 0 || nome.length <= 2 || nome == undefined) {
        res.status(404);
        res.json({ mensagem: "Verifique os dados do usuário!" });
        return;
    }

    if (type !== "cpf" || number.length !== 11 || type == undefined) {
        res.status(404);
        res.json({ mensagem: "Verifique os dados do usuário!" });
        return;
    }

    let encontrarId = [];

    for (let i = 0; i < arrayProdutosJson.length; i++) {
        arrayProductCarrinho.find(element => {
            if (element.id == arrayProdutosJson[i].id && element.quantidade < arrayProdutosJson[i].estoque) {
                encontrarId.push(true);
            } else if (element.id == arrayProdutosJson[i].id && element.quantidade > arrayProdutosJson[i].estoque) {
                encontrarId.push(false);
            }
        })
    }

    let estoqueValido = encontrarId.every((estoque) => estoque === true);

    if (!estoqueValido) {
        res.status(404);
        res.json({ mensagem: "Esse produto não tem estoque suficiente!" });
        return;
    }

    if (estoqueValido) {
        const dadosCarrinho = {
            subtotal: carrinhoFinal.subtotal,
            dataDeEntrega: carrinhoFinal.dataDeEntrega,
            valorDoFrete: carrinhoFinal.valorDoFrete,
            totalAPagar: carrinhoFinal.totalAPagar,
            produtos: carrinhoFinal.produtos
        };

        dadosCliente.mensagem = "Compra efetuada com sucesso"
        dadosCliente.carrinho = dadosCarrinho;

        for (let i = 0; i < arrayProdutosJson.length; i++) {
            arrayProductCarrinho.find(element => {
                if (element.id == arrayProdutosJson[i].id && element.quantidade <= arrayProdutosJson[i].estoque) {
                    arrayProdutosJson[i].estoque = arrayProdutosJson[i].estoque - element.quantidade;
                    fs.writeFile('./dados/data.json', JSON.stringify(produtos, null, 2));
                }
            })
        }

        fs.writeFile('./dados/carrinhoDados.json', JSON.stringify(dadosCliente, null, 2));

        carrinhoFinal.valorDoFrete = 0;
        carrinhoFinal.subtotal = 0;
        carrinhoFinal.totalAPagar = 0;
        carrinhoFinal.dataDeEntrega = null;
        carrinhoFinal.produtos = [];

        fs.writeFile('./dados/carrinhoFinal.json', JSON.stringify(carrinhoFinal, null, 2));

        res.status(200);
        res.json(dadosCliente);

        return;
    }
}

module.exports = {
    listarProdutos,
    listarCarrinho,
    adcionarProdutoNoCarrinho,
    alterarQuantidade,
    deletarProduto,
    limparCarrinho,
    finalizarCarrinho
};