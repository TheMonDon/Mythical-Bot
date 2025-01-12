const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Bot Support',
};

exports.commandData = new SlashCommandBuilder()
  .setName('global-blacklist')
  .setDescription('Add/Remove/Check if a user from the global blacklist')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a user to the blacklist')
      .addUserOption((option) =>
        option.setName('user').setDescription('The user to add to the blacklist').setRequired(true),
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('The reason to add the user to the blacklist').setRequired(true),
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
        option.setName('reason').setDescription('The reason to remove the user from the blacklist').setRequired(true),
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

  const blacklist = await db.get(`users.${user.id}.blacklist`);

  const embed = new EmbedBuilder()
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setTimestamp();

  switch (type) {
    case 'add': {
      if (blacklist) {
        return interaction.editReply('That user is already blacklisted.');
      }

      await db.set(`users.${user.id}.blacklist`, true);
      await db.set(`users.${user.id}.blacklistReason`, reason);

      embed.setTitle(`${user.tag} has been added to the global blacklist.`).addFields([
        { name: 'User:', value: `${user.tag} \n(${user.id})` },
        { name: 'Reason:', value: reason },
      ]);

      interaction.editReply({ embeds: [embed] });
      user.send({ embeds: [embed] }).catch(() => {});
      break;
    }

    case 'remove': {
      if (!blacklist) {
        return interaction.editReply('That user not blacklisted.');
      }

      await db.set(`users.${user.id}.blacklist`, false);
      await db.set(`users.${user.id}.blacklistReason`, reason);

      embed.setTitle(`${user.tag} has been removed from the global blacklist.`).addFields([
        { name: 'User:', value: `${user.tag} \n(${user.id})` },
        { name: 'Reason:', value: reason },
      ]);

      interaction.editReply({ embeds: [embed] });
      user.send({ embeds: [embed] }).catch(() => {});
      break;
    }

    case 'check': {
      const reason = (await db.get(`users.${user.id}.blacklistReason`)) || 'No reason specified';

      embed.setTitle(`${user.tag} blacklist check`).addFields([
        { name: 'User:', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Is Blacklisted?', value: blacklist ? 'True' : 'False', inline: true },
        { name: 'Reason', value: reason, inline: true },
      ]);

      interaction.editReply({ embeds: [embed] });
      break;
    }
  }
};
