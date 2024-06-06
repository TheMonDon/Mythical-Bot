const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('remove-money')
  .setDMPermission(false)
  .setDescription("Remove money to a member's cash or bank balance.")
  .addMentionableOption((option) =>
    option.setName('target').setDescription('The member or role to remove money to').setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('The amount of money to take')
      .setMinValue(1)
      .setMaxValue(1000000000000)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('destination')
      .setDescription('Where the money should come from')
      .addChoices({ name: 'Bank', value: 'bank' }, { name: 'Cash', value: 'cash' }),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const target = interaction.options.getMentionable('target');
  const type = interaction.options.getString('type')?.value || 'cash';
  let amount = interaction.options.getInteger('amount');
  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedErrorColor)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  if (isNaN(amount)) return interaction.client.util.errorEmbed(interaction, 'Invalid Amount');
  if (amount > 1000000000000)
    return interaction.client.util.errorEmbed(
      interaction,
      "You can't add more than 1 Trillion to a member",
      'Invalid Amount',
    );

  if (target.user) {
    if (!target.user) return interaction.client.util.errorEmbed(interaction, 'Invalid Member');
    if (target.user.bot) return interaction.client.util.errorEmbed(interaction, "You can't remove money from a bot.");

    amount = BigInt(amount);
    if (type === 'bank') {
      const bank = BigInt((await db.get(`servers.${interaction.guild.id}.users.${target.user.id}.economy.bank`)) || 0);
      const newAmount = bank - amount;
      await db.set(`servers.${interaction.guild.id}.users.${target.user.id}.economy.bank`, newAmount.toString());
    } else {
      const cash = BigInt(
        (await db.get(`servers.${interaction.guild.id}.users.${target.user.id}.economy.cash`)) ||
          (await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) ||
          0,
      );
      const newAmount = cash - amount;
      await db.set(`servers.${interaction.guild.id}.users.${target.user.id}.economy.cash`, newAmount.toString());
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 2048 ? `${csAmount.slice(0, 2048) + '...'}` : csAmount;

    embed
      .setColor(interaction.settings.embedColor)
      .setDescription(`Removed **${csAmount}** from ${target.user}'s ${type} balance.`)
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } else {
    const type = interaction.options.getString('type')?.value || 'cash';
    const role = target;
    const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

    if (isNaN(amount)) return interaction.client.util.errorEmbed(interaction, 'Incorrect Usage');

    const members = [...role.members.values()];

    amount = BigInt(amount);
    if (type === 'bank') {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          const current = BigInt((await db.get(`servers.${interaction.guild.id}.users.${mem.id}.economy.bank`)) || 0);
          const newAmount = current - amount;
          await db.set(`servers.${interaction.guild.id}.users.${mem.id}.economy.bank`, newAmount.toString());
        }
      });
    } else {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          const cash = BigInt(
            (await db.get(`servers.${interaction.guild.id}.users.${mem.id}.economy.cash`)) ||
              (await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) ||
              0,
          );
          const newAmount = cash - amount;
          await db.set(`servers.${interaction.guild.id}.users.${mem.id}.economy.cash`, newAmount.toString());
        }
      });
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;

    const embed = new EmbedBuilder()
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setColor(interaction.settings.embedColor)
      .setDescription(
        `Removed **${csAmount}** from the ${type} balance of ${members.length} ${
          members.length > 1 ? 'members' : 'member'
        } with the ${role} role.`,
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};