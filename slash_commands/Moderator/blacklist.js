const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('blacklist')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Add, remove, or check if a user is on the blacklist')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a user to the blacklist')
      .addUserOption((option) =>
        option.setName('user').setDescription('The user to add to the blacklist').setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('The reason to add the user to the blacklist')
          .setMinLength(1)
          .setMaxLength(1024)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('remove')
      .setDescription('Remove a user from the blacklist')
      .addUserOption((option) =>
        option.setName('user').setDescription('The user to remove from the blacklist').setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('The reason to remove the user from the blacklist')
          .setMinLength(1)
          .setMaxLength(1024)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('check')
      .setDescription('Check if a user is on the blacklist')
      .addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(true)),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const user = interaction.options.getUser('user');
  const type = interaction.options.getSubcommand();
  const reason = interaction.options.getString('reason');

  const mem = await interaction.client.util.getMember(interaction, user.id);
  if (!mem) return interaction.editReply('That user is not in this server.');

  const connection = await this.client.db.getConnection();
  const [blacklistRows] = await connection.execute(
    `SELECT * FROM server_blacklists WHERE server_id = ? AND user_id = ?`,
    [interaction.guild.id, mem.id],
  );

  const blacklisted = blacklistRows[0]?.blacklisted;

  const embed = new EmbedBuilder()
    .setAuthor({ name: mem.displayName, iconURL: interaction.member.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setTimestamp();

  switch (type) {
    case 'add': {
      if (blacklisted) {
        connection.release();
        return interaction.editReply('That user is already blacklisted.');
      }

      await connection.execute(
        `INSERT INTO server_blacklists (server_id, user_id, blacklisted, reason)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
        [interaction.guild.id, mem.id, true, reason],
      );

      embed.setTitle(`${mem.user.tag} has been added to the blacklist.`).addFields([
        { name: 'Reason', value: reason },
        { name: 'Member', value: `${mem.displayName} \n(${mem.id})` },
        { name: 'Server', value: `${interaction.guild.name} \n(${interaction.guild.id})` },
      ]);

      connection.release();
      interaction.editReply({ embeds: [embed] });
      return mem.send({ embeds: [embed] });
    }

    case 'remove': {
      if (!blacklisted) {
        connection.release();
        return interaction.editReply('That user is not blacklisted');
      }

      await connection.execute(
        `INSERT INTO server_blacklists (server_id, user_id, blacklisted, reason)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
        [interaction.guild.id, mem.id, false, reason],
      );

      embed.setTitle(`${mem.user.tag} has been removed to the blacklist.`).addFields([
        { name: 'Reason', value: reason },
        { name: 'Member', value: `${mem.displayName} \n(${mem.id})` },
        { name: 'Server', value: `${interaction.guild.name} \n(${interaction.guild.id})` },
      ]);

      connection.release();
      interaction.editReply({ embeds: [embed] });
      return mem.send({ embeds: [embed] });
    }

    case 'check': {
      const blacklistReason = blacklistRows[0]?.reason || 'No reason provided';

      embed.setTitle(`${mem.user.tag} blacklist check`).addFields([
        { name: 'Member', value: `${mem.user.tag} (${mem.id})`, inline: true },
        { name: 'Is Blacklisted?', value: blacklisted ? 'True' : 'False' },
        { name: 'Reason', value: blacklistReason, inline: true },
      ]);

      connection.release();
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
