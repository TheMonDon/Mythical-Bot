const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('blacklist')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Add/remove/check if users blacklisted from the bot')
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
  await interaction.deferReply();
  const user = interaction.options.getUser('user');
  const type = interaction.options.getSubcommand();
  const reason = interaction.options.getString('reason');

  const mem = await interaction.client.util.getMember(interaction, user.id);
  if (!mem) return interaction.editReply('That member was not found');

  const blacklist = await db.get(`servers.${interaction.guild.id}.users.${mem.id}.blacklist`);

  const embed = new EmbedBuilder()
    .setAuthor({ name: mem.displayName, iconURL: interaction.member.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setTimestamp();

  switch (type) {
    case 'add': {
      // Add member to blacklist
      if (blacklist) {
        return interaction.editReply('That user is already blacklisted.');
      }

      await db.set(`servers.${interaction.guild.id}.users.${mem.id}.blacklist`, true);
      await db.set(`servers.${interaction.guild.id}.users.${mem.id}.blacklistReason`, reason);

      embed.setTitle(`${mem.user.tag} has been added to the blacklist.`).addFields([
        { name: 'Reason:', value: reason },
        { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
        { name: 'Server:', value: `${interaction.guild.name} \n(${interaction.guild.id})` },
      ]);

      interaction.editReply({ embeds: [embed] });
      return mem.send({ embeds: [embed] });
    }

    case 'remove': {
      // remove member from blacklist
      if (!blacklist) return interaction.editReply('That user is not blacklisted');

      await db.set(`servers.${interaction.guild.id}.users.${mem.id}.blacklist`, false);
      await db.set(`servers.${interaction.guild.id}.users.${mem.id}.blacklistReason`, reason);

      embed.setTitle(`${mem.user.tag} has been removed to the blacklist.`).addFields([
        { name: 'Reason:', value: reason },
        { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
        { name: 'Server:', value: `${interaction.guild.name} \n(${interaction.guild.id})` },
      ]);

      interaction.editReply({ embeds: [embed] });
      return mem.send({ embeds: [embed] });
    }

    case 'check': {
      // check if member is blacklisted
      const reason = (await db.get(`servers.${interaction.guild.id}.users.${mem.id}.blacklistReason`)) || false;

      const bl = blacklist ? 'is' : 'is not';
      embed.setTitle(`${mem.user.tag} blacklist check`).addFields([
        { name: 'Member:', value: `${mem.user.tag} (${mem.id})`, inline: true },
        { name: 'Is Blacklisted?', value: `That user ${bl} blacklisted.` },
      ]);
      if (reason) embed.addFields([{ name: 'reason', value: reason, inline: true }]);

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
