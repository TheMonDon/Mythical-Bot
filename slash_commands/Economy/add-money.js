const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('add-money')
  .setContexts(InteractionContextType.Guild)
  .setDescription("Add money to a member's cash or bank balance.")
  .addMentionableOption((option) =>
    option.setName('target').setDescription('The member or role to add money to').setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('The amount of money to add')
      .setMinValue(1)
      .setMaxValue(1000000000000)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('destination')
      .setDescription('Where the money should go')
      .addChoices({ name: 'Bank', value: 'bank' }, { name: 'Cash', value: 'cash' }),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const connection = await interaction.client.db.getConnection();

  const target = interaction.options.getMentionable('target');
  const destination = interaction.options.getString('destination') || 'cash';
  let amount = interaction.options.getInteger('amount');

  const [economyRows] = await connection.execute(
    /* sql */ `
      SELECT
        *
      FROM
        economy_settings
      WHERE
        guild_id = ?
    `,
    [interaction.guild.id],
  );
  const currencySymbol = economyRows[0]?.symbol || '$';

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedErrorColor)
    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

  if (isNaN(amount)) {
    connection.release();
    return interaction.client.util.errorEmbed(interaction, 'Invalid Amount');
  }
  if (amount > 1000000000000) {
    connection.release();
    return interaction.client.util.errorEmbed(
      interaction,
      "You can't add more than 1 Trillion to a member",
      'Invalid Amount',
    );
  }

  if (target.user) {
    if (!target.user) {
      connection.release();
      return interaction.client.util.errorEmbed(interaction, 'Invalid Member');
    }
    if (target.user.bot) {
      connection.release();
      return interaction.client.util.errorEmbed(interaction, "You can't add money to a bot.");
    }

    amount = BigInt(amount);
    if (destination === 'bank') {
      const bank = BigInt((await db.get(`servers.${interaction.guild.id}.users.${target.user.id}.economy.bank`)) || 0);
      const newAmount = bank + amount;
      await db.set(`servers.${interaction.guild.id}.users.${target.user.id}.economy.bank`, newAmount.toString());
    } else {
      const cash = BigInt(
        (await db.get(`servers.${interaction.guild.id}.users.${target.user.id}.economy.cash`)) ||
          economyRows[0]?.start_balance ||
          0,
      );
      const newAmount = cash + amount;
      await db.set(`servers.${interaction.guild.id}.users.${target.user.id}.economy.cash`, newAmount.toString());
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = interaction.client.util.limitStringLength(csAmount, 0, 2048);

    embed
      .setColor(interaction.settings.embedColor)
      .setDescription(`Added **${csAmount}** to ${target.user}'s ${destination} balance.`)
      .setTimestamp();

    connection.release();
    return interaction.editReply({ embeds: [embed] });
  } else {
    const role = target;

    if (isNaN(amount)) {
      connection.release();
      return interaction.client.util.errorEmbed(interaction, 'Incorrect Usage');
    }
    if (amount === Infinity) {
      connection.release();
      return interaction.client.util.errorEmbed(interaction, "You can't add Infinity to a member", 'Invalid Amount');
    }

    // Ensure the members cache is populated
    await interaction.guild.members.fetch();
    const members = [...role.members.values()];

    amount = BigInt(amount);
    if (destination === 'bank') {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          const current = BigInt((await db.get(`servers.${interaction.guild.id}.users.${mem.id}.economy.bank`)) || 0);
          const newAmount = current + amount;
          await db.set(`servers.${interaction.guild.id}.users.${mem.id}.economy.bank`, newAmount.toString());
        }
      });
    } else {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          const cash = BigInt(
            (await db.get(`servers.${interaction.guild.id}.users.${mem.id}.economy.cash`)) ||
              economyRows[0]?.start_balance ||
              0,
          );
          const newAmount = cash + amount;
          await db.set(`servers.${interaction.guild.id}.users.${mem.id}.economy.cash`, newAmount.toString());
        }
      });
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = interaction.client.util.limitStringLength(csAmount, 0, 1024);

    const embed = new EmbedBuilder()
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setColor(interaction.settings.embedColor)
      .setDescription(
        `Added **${csAmount}** to the ${destination} balance of ${members.length} ${
          members.length > 1 ? 'members' : 'member'
        } with the ${role} role.`,
      )
      .setTimestamp();

    connection.release();
    return interaction.editReply({ embeds: [embed] });
  }
};
