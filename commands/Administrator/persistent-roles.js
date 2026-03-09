const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class persistentRoles extends Command {
  constructor(client) {
    super(client, {
      name: 'persistent-roles',
      description: 'Enable/Disable the persistent roles system for the server',
      longDescription:
        'When persistent roles is enabled users who leave the guild will have their roles automatically returned when they come back.',
      category: 'Administrator',
      permLevel: 'Administrator',
      usage: 'persistent-roles [enable | disable]',
      aliases: ['pr', 'proles'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.guild.members.me.permissions.has('ManageRoles')) {
      return this.client.util.errorEmbed(
        msg,
        'The bot requires Manage Roles permission to use this.',
        'Missing Permission',
      );
    }

    const [toggleRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          persistent_roles
        FROM
          server_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const toggle = toggleRows[0]?.persistent_roles === 1;

    if (!args || args.length < 1) {
      const embed = new EmbedBuilder().setTitle('Persistent Roles System').setColor(msg.settings.embedColor)
        .setDescription(stripIndents`The persistent roles system is currently **${toggle ? 'enabled' : 'disabled'}**.
          Use \`${msg.settings.prefix}persistent-roles [enable | disable]\` to change the status.
          
          When persistent roles is enabled users who leave the guild will have their roles automatically returned when they come back.`);

      return msg.channel.send({ embeds: [embed] });
    }

    const option = args[0].toLowerCase();

    if (option !== 'enable' && option !== 'disable') {
      return this.client.util.errorEmbed(msg, 'Please use either `enable` or `disable`.', 'Invalid Option');
    }

    if (option === 'enable') {
      if (toggle) {
        return msg.channel.send('The persistent role system for this server is already enabled.');
      }

      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            server_settings (server_id, persistent_roles)
          VALUES
            (?, ?) ON DUPLICATE KEY
          UPDATE persistent_roles =
          VALUES
            (persistent_roles)
        `,
        [msg.guild.id, true],
      );
      return msg.channel.send('The persistent role system for this server has been enabled.');
    } else if (option === 'disable') {
      if (!toggle) {
        return msg.channel.send('The persistent role system for this server is already disabled.');
      }

      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            server_settings (server_id, persistent_roles)
          VALUES
            (?, ?) ON DUPLICATE KEY
          UPDATE persistent_roles =
          VALUES
            (persistent_roles)
        `,
        [msg.guild.id, false],
      );

      return msg.channel.send('The persistent role system for this server has been disabled.');
    }
  }
}

module.exports = persistentRoles;
