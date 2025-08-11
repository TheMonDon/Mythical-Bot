const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');

exports.conf = {
  permLevel: 'Bot Support',
};

exports.commandData = new SlashCommandBuilder()
  .setName('global-blacklist')
  .setDescription('Add, remove, or check if a user is on the global blacklist')
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
      .setDescription('Remove a user from being blacklisted')
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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');
  const type = interaction.options.getSubcommand();
  const reason = interaction.options.getString('reason');

  const connection = await interaction.client.db.getConnection();
  const [blacklistRows] = await connection.execute(`SELECT * FROM global_blacklists WHERE user_id = ?`, [user.id]);
  const blacklisted = blacklistRows[0]?.blacklisted;

  const embed = new EmbedBuilder()
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setTimestamp();

  switch (type) {
    case 'add': {
      if (blacklisted) {
        connection.release();
        return interaction.editReply('That user is already blacklisted.');
      }

      await connection.execute(
        `INSERT INTO global_blacklists (user_id, blacklisted, reason)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
        [user.id, true, reason],
      );

      embed.setTitle(`${user.tag} has been added to the global blacklist.`).addFields([
        { name: 'User', value: `${user.tag} \n(${user.id})` },
        { name: 'Reason', value: reason },
      ]);

      connection.release();
      interaction.editReply({ embeds: [embed] });
      return user.send({ embeds: [embed] }).catch(() => {});
    }

    case 'remove': {
      if (!blacklisted) {
        connection.release();
        return interaction.editReply('That user not blacklisted.');
      }

      await connection.execute(
        `INSERT INTO global_blacklists (user_id, blacklisted, reason)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
        [user.id, false, reason],
      );

      embed.setTitle(`${user.tag} has been removed from the global blacklist.`).addFields([
        { name: 'User', value: `${user.tag} \n(${user.id})` },
        { name: 'Reason', value: reason },
      ]);

      connection.release();
      interaction.editReply({ embeds: [embed] });
      return user.send({ embeds: [embed] }).catch(() => {});
    }

    case 'check': {
      const blacklistReason = blacklistRows[0]?.reason || 'No reason provided';

      embed.setTitle(`${user.tag} blacklist check`).addFields([
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Is Blacklisted?', value: blacklisted ? 'True' : 'False', inline: true },
        { name: 'Reason', value: blacklistReason, inline: true },
      ]);

      connection.release();
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
