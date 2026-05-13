require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  SlashCommandBuilder
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

// Nova categoria e cargos do sorteio
const CATEGORIA_SORTEIO = "1417251148544348411";
const CARGOS_SORTEIO = [
  "1417191757384519690",
  "1417191596528504883"
];

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

client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName("sortear")
      .setDescription("Sorteia um Corregedor responsável pelo processo.")
  );

  console.log("Comando /sortear registrado com sucesso.");
});

// COMANDO /SORTEAR
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "sortear") return;

  const channel = interaction.channel;

  if (!interaction.guild) {
    return interaction.reply({
      content: "Este comando só pode ser usado dentro do servidor.",
      ephemeral: true
    });
  }

  if (!channel || channel.parentId !== CATEGORIA_SORTEIO) {
    return interaction.reply({
      content: "Este comando só pode ser usado nos canais da categoria autorizada.",
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const membros = await interaction.guild.members.fetch();

  const elegiveis = membros.filter(member => {
    if (member.user.bot) return false;

    return CARGOS_SORTEIO.some(cargoId =>
      member.roles.cache.has(cargoId)
    );
  });

  if (!elegiveis.size) {
    return interaction.editReply("Nenhum membro elegível foi encontrado para o sorteio.");
  }

  const lista = Array.from(elegiveis.values());
  const sorteado = lista[Math.floor(Math.random() * lista.length)];

  await interaction.editReply(
`━━━━━━━━━━━━━━━━◇◆◇━━━━━━━━━━━━━━━━
PODER JUDICIÁRIO 
━━━━━━━━━━━━━━━━◇◆◇━━━━━━━━━━━━━━━━
O Corregedor responsável por este processo com base no sorteio é: ${sorteado}

Todas as delegações deste fica por sua responsabilidade.`
  );
});

// NOTIFICAÇÃO DE MOVIMENTAÇÃO
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const channel = message.channel;

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
