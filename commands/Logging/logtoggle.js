const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const db = require('quick.db');
const { stripIndents } = require('common-tags');

class logtoggle extends Command {
  constructor (client) {
    super(client, {
      name: 'logtoggle',
      description: 'Toggle individual logs',
      usage: 'logtoggle <module>',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['togglelog', 'tl', 'lt']
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    const query = args.join(' ');

    //define embeds
    const error_embed = new DiscordJS.MessageEmbed();
    if (!db.get(`servers.${msg.guild.id}.logs.channel`)) return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setlogchannel <channel>\``);

    //define regex
    const cc = /(channel[-]?created)/gi;
    const cd = /(channel[-]?deleted)/gi;
    const cu = /(channel[-]?deleted)/gi;
    const vcc = /((voice|v)[-]?channel[-]?created)/gi;
    const vcd = /((voice|v)[-]?channel[-]?created)/gi;
    const mj = /(member[-]?join(ed)?)/gi;
    const ml = /(member[-]?leave)/gi;
    const me1 = /(message[-]?edited)/gi;
    const md = /(message[-]?deleted)/gi;
    const rc = /(role[-]?created)/gi;
    const rd = /(role[-]?deleted)/gi;
    const ru = /(role[-]?updated)/gi;
    const ec = /(emoji[-]?created)/gi;
    const ed = /(emoji[-]?deleted)/gi;

    error_embed.setTitle(':x: Invalid parameter.');
    error_embed.addField('Valid Parameters', stripIndents(`
        channel-created
        channel-deleted
        channel-updated
        v-channel-created
        v-channel-deleted
        member-join
        member-leave
        message-edited
        message-deleted
        role-created
        role-deleted
        role-updated
        emoji-created
        emoji-deleted
        `), true);
    if (cc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.channel-created`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-created`, 'disabled');
        msg.channel.send('Channel-Created logs has been disabled.');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-created`, 'enabled');
        msg.channel.send('Channel-Created logs has been enabled.');
      }
    } else if (cd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.channel-deleted`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-deleted`, 'disabled');
        msg.channel.send('Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-deleted`, 'enabled');
        msg.channel.send('Channel-Deleted logs has been enabled');
      }
    } else if (cu.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.channel-updated`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-updated`, 'disabled');
        msg.channel.send('Channel-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-updated`, 'enabled');
        msg.channel.send('Channel-Updated logs has been enabled');
      }
    } else if (vcc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.v-channel-created`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-created`, 'disabled');
        msg.channel.send('Voice-Channel-Created logs has been disabled.');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-created`, 'enabled');
        msg.channel.send('Voice-Channel-Created logs has been enabled.');
      }
    } else if (vcd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`, 'disabled');
        msg.channel.send('Voice-Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`, 'enabled');
        msg.channel.send('Voice-Channel-Deleted logs has been enabled');
      }
    } else if (mj.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.member-join`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-join`, 'disabled');
        msg.channel.send('Member-Join logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-join`, 'enabled');
        msg.channel.send('Member-Join logs has been enabled');
      }
    } else if (ml.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.member-leave`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-leave`, 'disabled');
        msg.channel.send('Member-Leave logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-leave`, 'enabled');
        msg.channel.send('Member-Leave logs has been enabled');
      }
    } else if (me1.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.message-edited`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-edited`, 'disabled');
        msg.channel.send('Message-Edited logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-edited`, 'enabled');
        msg.channel.send('Message-Edited logs has been enabled');
      }
    } else if (md.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.message-deleted`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-deleted`, 'disabled');
        msg.channel.send('Message-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-deleted`, 'enabled');
        msg.channel.send('Message-Deleted logs has been enabled');
      }
    } else if (rc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.role-created`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-created`, 'disabled');
        msg.channel.send('Role-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-created`, 'enabled');
        msg.channel.send('Role-Created logs has been enabled');
      }
    } else if (rd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.role-deleted`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-deleted`, 'disabled');
        msg.channel.send('Role-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-deleted`, 'enabled');
        msg.channel.send('Role-Deleted logs has been enabled');
      }
    } else if (ru.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.role-updated`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-updated`, 'disabled');
        msg.channel.send('Role-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-updated`, 'enabled');
        msg.channel.send('Role-Updated logs has been enabled');
      }
    } else if (ec.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.emoji-created`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-created`, 'disabled');
        msg.channel.send('Emoji-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-created`, 'enabled');
        msg.channel.send('Emoji-Created logs has been enabled');
      }
    } else if (ed.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`) == 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`, 'disabled');
        msg.channel.send('Emoji-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`, 'enabled');
        msg.channel.send('Emoji-Deleted logs has been enabled');
      }
    } else {
      msg.channel.send(error_embed);
    }
  }
}

module.exports = logtoggle;