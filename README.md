# Transações Distribuídas

Este projeto apresenta um sistema de replicação. Uma mensagem é enviada a um
coordenador "sem estado" e que encaminha a mensagem a cada um dos nós,
replicando a mensagem.

## Execução

É necessário ter o **Docker** e o **Docker Compose** instalados para executar
este projeto adequadamente.

Para iniciar o coordenador e seus três nós de replicação, execute o comando
abaixo:

```shell
docker-compose up -d
```

Para enviar uma mensagem para o coordenador:

```shell
curl -X POST \
  -H "Content-type: application/json" \
  -d "{\"date\":\"$(date -Iseconds)\"}" \
  http://localhost:3000/messages
```

É possível injetar uma falha em um broker específico. Com isso podemos testar o
rollback do sistema. Por exemplo, para inserir uma falha no `broker-02` durante
a criação de uma mensagem enviamos o header `X-Fault-Injection`:

```shell
curl -X POST \
  -H "Content-type: application/json" \
  -H "X-Fault-Injection: broker-02" \
  -d "{\"date\":\"$(date -Iseconds)\"}" \
  http://localhost:3000/messages
```
