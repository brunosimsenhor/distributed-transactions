# Transações Distribuídas

## Descrição

Esta aplicação representa um sistema de mensageria. Em seu uso, o cliente envia
uma mensagem para o coordenador que então inicia uma transação e envia a mesma
mensagem para cada um dos participantes, garantindo para o cliente que a
mensagem foi recebida e está replicada corretamente.

Seu uso pode ser descrito desta forma:

1. o cliente envia uma mensagem para o coordenador
2. o coordenador inicia uma transação e avisa os participantes
3. o coordenador envia a mensagem para os participantes juntamente com o
comando de **prepare** para **todos** os participantes
4. o coordenador aguarda a resposta dos participantes e então:
  1. no caso de sucesso para todos os participantes, o coordenador envia o
  commando de **commit** para todos os participantes.
  2. no caso de falha em um ou mais participantes, o coordenador envia o
  commando de **rollback** para todos os participantes.

Quando um participante se recuperar de um problema, ou seja, ficar offline, ele
irá consultar o coordenador a respeito do estado de cada uma das transações que
constavam como abertas.

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
