const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

// Set guildOnly to true if you want it to be available on guilds only.
// Otherwise false is global.
exports.conf = {
  permLevel: 'User',
  guildOnly: true,
};

exports.commandData = {
  name: 'balance',
  description: 'Check your balance',
  options: [
    {
      type: 6,
      name: 'user',
      description: 'Check the balance of another user',
    },
  ],
  dmPermission: false,
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  let mem = interaction.options?.get('user')?.member;
  if (!mem) mem = interaction.member;

  const cash = parseFloat(
    db.get(`servers.${interaction.guildId}.users.${mem.id}.economy.cash`) ||
      db.get(`servers.${interaction.guildId}.economy.startBalance`) ||
      0,
  );
  const bank = parseFloat(db.get(`servers.${interaction.guildId}.users.${mem.id}.economy.bank`) || 0);
  const netWorth = cash + bank;

  const currencySymbol = db.get(`servers.${interaction.guildId}.economy.symbol`) || '$';

  const authorName = mem.user.discriminator === '0' ? mem.user.username : mem.user.tag;
  const embed = new EmbedBuilder()
    .setAuthor({ name: authorName, iconURL: mem.user.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .addFields([
      { name: 'Cash:', value: currencySymbol + cash.toLocaleString() },
      { name: 'Bank:', value: currencySymbol + bank.toLocaleString() },
      { name: 'Net Worth:', value: currencySymbol + netWorth.toLocaleString() },
    ])
    .setTimestamp();
  return interaction.editReply({ embeds: [embed] });
};
