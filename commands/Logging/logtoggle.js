const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const db = require('quick.db');

class LogToggle extends Command {
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

  async run (msg, args) {
    const query = args.join(' ').toLowerCase();

    const errorEmbed = new DiscordJS.MessageEmbed();
    if (!db.get(`servers.${msg.guild.id}.logs.channel`)) return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setlogchannel <channel>\``);

    // define regex
    const cc = /^(channel[-]?created)/gi;
    const cd = /^(channel[-]?deleted)/gi;
    const cu = /^(channel[-]?updated)/gi;
    const tc = /^(thread[-]?created)/gi;
    const td = /^(thread[-]?deleted)/gi;
    const vcc = /^((voice|v)[-]?channel[-]?created)/gi;
    const vcd = /^((voice|v)[-]?channel[-]?created)/gi;
    const mj = /^(member[-]?join(ed)?)/gi;
    const ml = /^(member[-]?leave)/gi;
    const me1 = /^(message[-]?edited)/gi;
    const md = /^(message[-]?deleted)/gi;
    const rc = /^(role[-]?created)/gi;
    const rd = /^(role[-]?deleted)/gi;
    const ru = /^(role[-]?updated)/gi;
    const ec = /^(emoji[-]?created)/gi;
    const ed = /^(emoji[-]?deleted)/gi;
    const bmd = /^(bulk[-]?messages[-]?deleted)/gi;

    errorEmbed.setTitle(':x: Invalid parameter.');
    errorEmbed.addField('Valid Parameters', `
channel-created
channel-deleted
channel-updated
thread-created
thread-deleted
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
bulk-messages-deleted`, true);
    errorEmbed.addField('Other Usage:', 'logtoggle <enable/disable> <channel> to enable/disable a channel from being logged.', false);
    if (['enable', 'disable'].includes(args?.[0].toLowerCase())) {
      if (args?.[0].toLowerCase() === 'enable') {
        // Enable channel

        let chan;
        if (!args[1]) {
          chan = msg.channel;
        } else {
          chan = msg.mentions.channels.first() ||
            msg.guild.channels.cache.find(c => c.id === `${args[1]}`) ||
            msg.guild.channels.cache.find(c => c.name.toLowerCase() === `${args[1].toLowerCase()}`) ||
            msg.guild.channels.cache.find(c => c.name.toLowerCase().includes(`${args[1].toLowerCase()}`));
        }
        if (!chan) return msg.channel.send('I could not find a channel with that information.');

        const chans = db.get(`servers.${msg.guild.id}.logs.noLogChans`);
        if (chans) {
          if (!chans.includes(chan.id)) return msg.channel.send('That channel is already enabled.');
        }
        const indx = chans.indexOf(chan.id);

        if (indx > -1) {
          chans.splice(indx, 1);
          db.set(`servers.${msg.guild.id}.logs.noLogChans`, chans);
          return msg.channel.send(`Successfully removed ${chan.id} (${chan.name}) from the channel blacklist.`);
        } else {
          return msg.channel.send('I could not find a channel with that info in the blacklist.');
        }
      } else if (args?.[0].toLowerCase() === 'disable') {
        // disable channel

        let chan;
        if (!args[1]) {
          chan = msg.channel;
        } else {
          chan = msg.mentions.channels.first() ||
            msg.guild.channels.cache.find(c => c.id === `${args[1]}`) ||
            msg.guild.channels.cache.find(c => c.name.toLowerCase() === `${args[1].toLowerCase()}`) ||
            msg.guild.channels.cache.find(c => c.name.toLowerCase().includes(`${args[1].toLowerCase()}`));
        }
        if (!chan) return msg.channel.send('I could not find a channel with that information.');

        const chans = db.get(`servers.${msg.guild.id}.logs.noLogChans`);
        if (chans) {
          if (chans.includes(chan)) return msg.channel.send('That channel is already disabled.');
        }
        db.push(`servers.${msg.guild.id}.logs.noLogChans`, chan.id);
        return msg.channel.send(`Successfully added ${chan.id} (${chan.name}) to the channel blacklist.`);
      } else {
        return msg.channel.send(args[1]);
      }
    } else if (cc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.channel-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-created`, 'disabled');
        msg.channel.send('Channel-Created logs has been disabled.');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-created`, 'enabled');
        msg.channel.send('Channel-Created logs has been enabled.');
      }
    } else if (cd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.channel-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-deleted`, 'disabled');
        msg.channel.send('Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-deleted`, 'enabled');
        msg.channel.send('Channel-Deleted logs has been enabled');
      }
    } else if (cu.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.channel-updated`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-updated`, 'disabled');
        msg.channel.send('Channel-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.channel-updated`, 'enabled');
        msg.channel.send('Channel-Updated logs has been enabled');
      }
    } else if (vcc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.v-channel-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-created`, 'disabled');
        msg.channel.send('Voice-Channel-Created logs has been disabled.');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-created`, 'enabled');
        msg.channel.send('Voice-Channel-Created logs has been enabled.');
      }
    } else if (vcd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`, 'disabled');
        msg.channel.send('Voice-Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`, 'enabled');
        msg.channel.send('Voice-Channel-Deleted logs has been enabled');
      }
    } else if (mj.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.member-join`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-join`, 'disabled');
        msg.channel.send('Member-Join logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-join`, 'enabled');
        msg.channel.send('Member-Join logs has been enabled');
      }
    } else if (ml.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.member-leave`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-leave`, 'disabled');
        msg.channel.send('Member-Leave logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.member-leave`, 'enabled');
        msg.channel.send('Member-Leave logs has been enabled');
      }
    } else if (me1.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.message-edited`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-edited`, 'disabled');
        msg.channel.send('Message-Edited logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-edited`, 'enabled');
        msg.channel.send('Message-Edited logs has been enabled');
      }
    } else if (md.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.message-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-deleted`, 'disabled');
        msg.channel.send('Message-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.message-deleted`, 'enabled');
        msg.channel.send('Message-Deleted logs has been enabled');
      }
    } else if (rc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.role-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-created`, 'disabled');
        msg.channel.send('Role-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-created`, 'enabled');
        msg.channel.send('Role-Created logs has been enabled');
      }
    } else if (rd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.role-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-deleted`, 'disabled');
        msg.channel.send('Role-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-deleted`, 'enabled');
        msg.channel.send('Role-Deleted logs has been enabled');
      }
    } else if (ru.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.role-updated`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-updated`, 'disabled');
        msg.channel.send('Role-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.role-updated`, 'enabled');
        msg.channel.send('Role-Updated logs has been enabled');
      }
    } else if (ec.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.emoji-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-created`, 'disabled');
        msg.channel.send('Emoji-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-created`, 'enabled');
        msg.channel.send('Emoji-Created logs has been enabled');
      }
    } else if (ed.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`, 'disabled');
        msg.channel.send('Emoji-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`, 'enabled');
        msg.channel.send('Emoji-Deleted logs has been enabled');
      }
    } else if (bmd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.bulk-messages-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.bulk-messages-deleted`, 'disabled');
        msg.channel.send('Bulk-Messages-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.bulk-messages-deleted`, 'enabled');
        msg.channel.send('Bulk-Messages-Deleted logs has been enabled');
      }
    } else if (tc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.thread-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.thread-created`, 'disabled');
        msg.channel.send('Thread-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.thread-created`, 'enabled');
        msg.channel.send('Thread-Created logs have been enabled');
      }
    } else if (td.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.log_system.thread-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.log_system.thread-deleted`, 'disabled');
        msg.channel.send('Thread-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.log_system.thread-deleted`, 'enabled');
        msg.channel.send('Thread-Deleted logs have been enabled');
      }
    } else {
      msg.channel.send({ embeds: [errorEmbed] });
    }
  }
}

module.exports = LogToggle;
