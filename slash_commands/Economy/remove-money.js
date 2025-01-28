const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('remove-money')
  .setContexts(InteractionContextType.Guild)
  .setDescription("Remove money to a member's cash or bank balance.")
  .addMentionableOption((option) =>
    option.setName('target').setDescription('The member or role to remove money from').setRequired(true),
  )
  .addIntegerOption((option) =>
    option.setName('amount').setDescription('The amount of money to take').setMinValue(1).setRequired(true),
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
  const destination = interaction.options.getString('destination') || 'cash';
  let amount = interaction.options.getInteger('amount');
  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedErrorColor)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  if (isNaN(amount) || amount === Infinity) return interaction.client.util.errorEmbed(interaction, 'Invalid Amount');

  if (target.user) {
    if (!target.user) return interaction.client.util.errorEmbed(interaction, 'Invalid Member');
    if (target.user.bot) return interaction.client.util.errorEmbed(interaction, "You can't remove money from a bot.");

    amount = BigInt(amount);
    if (destination === 'bank') {
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
    csAmount = interaction.client.util.limitStringLength(csAmount);

    embed
      .setColor(interaction.settings.embedColor)
      .setDescription(`Removed **${csAmount}** from ${target.user}'s ${destination} balance.`)
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } else {
    const role = target;
    const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

    if (isNaN(amount)) return interaction.client.util.errorEmbed(interaction, 'Incorrect Usage');

    const members = [...role.members.values()];

    amount = BigInt(amount);
    if (destination === 'bank') {
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
    csAmount = interaction.client.util.limitStringLength(csAmount, 0, 1024);

    const embed = new EmbedBuilder()
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setColor(interaction.settings.embedColor)
      .setDescription(
        `Removed **${csAmount}** from the ${destination} balance of ${members.length} ${
          members.length > 1 ? 'members' : 'member'
        } with the ${role} role.`,
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
