const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class RemoveMember extends Command {
  constructor(client) {
    super(client, {
      name: 'remove-member',
      description: 'Remove a member from a ticket.',
      usage: 'remove-member <Member>',
      category: 'Tickets',
      aliases: ['removemember', 'remove'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [msg.guild.id]);

    if (rows.length === 0) {
      connection.release();
      return msg.channel.send('The ticket system has not been setup in this server.');
    }

    if (!msg.channel.name.startsWith('ticket')) {
      connection.release();
      return msg.channel.send('You need to be inside the ticket you want to remove a member from.');
    }

    const mem = await this.client.util.getMember(msg, args.join(' '));
    if (!mem) {
      connection.release();
      return msg.channel.send('That is not a valid member.');
    }
    if (mem.id === msg.author.id) {
      connection.release();
      return msg.channel.send(`Are you trying to close your ticket? Use \`${msg.settings.prefix}close\` instead`);
    }

    const roleID = rows[0].role_id;
    const role = msg.guild.roles.cache.get(roleID);
    const [ownerRows] = await connection.execute(
      `SELECT user_id FROM user_tickets WHERE server_id = ? AND channel_id = ?`,
      [msg.guild.id, msg.channel.id],
    );
    const owner = ownerRows[0]?.user_id;

    if (!owner) {
      connection.release();
      return msg.channel.send('This ticket does not have an owner.');
    }

    // Do they have the support role or are owner?
    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        connection.release();
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to remove a user.`);
      }
    }

    if (!msg.channel.members.get(mem.id)) {
      connection.release();
      return msg.channel.send('That person has not been added to this ticket.');
    }

    msg.channel.permissionOverwrites.edit(mem.id, { ViewChannel: null });

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Member Removed')
      .setColor(msg.settings.embedColor)
      .setDescription(`${msg.author} has removed a member: \n${mem} (${mem.displayName})`);

    connection.release();
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = RemoveMember;
