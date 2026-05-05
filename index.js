require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CATEGORIA_PROCESSOS = process.env.CATEGORIA_PROCESSOS;
const CANAL_LOGS = process.env.CANAL_LOGS;

function dataHoraBrasil() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const channel = message.channel;

    // Só canais dentro da categoria
    if (channel.parentId !== CATEGORIA_PROCESSOS) return;
    if (channel.type !== ChannelType.GuildText) return;

    const logChannel = message.guild.channels.cache.get(CANAL_LOGS);
    const membros = await message.guild.members.fetch();

    const membrosComAcesso = membros.filter(member => {
      if (member.user.bot) return false;

      return channel
        .permissionsFor(member)
        ?.has(PermissionsBitField.Flags.ViewChannel);
    });

    const receberam = [];
    const falhas = [];

    // 🔔 ENVIO DE DM
    for (const [, member] of membrosComAcesso) {
      try {
        await member.send(
`⚖️ Notificação — Corregedoria Geral do SAMU
Poder Judiciário
──────────────────────────────
Houve nova movimentação no canal ${channel.name}
Acompanhe o andamento do processo no canal delegado.
Acesso direto à movimentação: ${message.url}
──────────────────────────────
Corregedoria Geral do SAMU
Poder Judiciário
──────────────────────────────`
        );

        receberam.push(member);
      } catch {
        falhas.push(member);
      }
    }

    // 📄 LOG
    if (logChannel) {
      const listaReceberam = receberam.length
        ? receberam.map(m => `${m}`).join(", ")
        : "Nenhum membro recebeu a notificação.";

      const listaFalhas = falhas.length
        ? falhas.map(m => `${m}`).join(", ")
        : "Nenhuma falha registrada.";

      await logChannel.send(
`⚖️ Log de Notificação Automática
Movimentação detectada em canal processual da Corregedoria.
Canal: ${channel.name}
Autor da movimentação
${message.author}
Mensagem
${message.url}
Notificações enviadas
✅ ${receberam.length}
Receberam
${listaReceberam}
Falhas
❌ ${falhas.length}
${listaFalhas}
Corregedoria Geral do SAMU • Poder Judiciário • ${dataHoraBrasil()}`
      );
    }

  } catch (error) {
    console.error("Erro no bot:", error);
  }
});

client.login(process.env.TOKEN);