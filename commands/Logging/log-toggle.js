const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class LogToggle extends Command {
  constructor(client) {
    super(client, {
      name: 'log-toggle',
      description: 'Toggle individual logs',
      usage: 'Log-Toggle <module>',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['togglelog', 'logtoggle', 'tl', 'lt'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const query = args.join(' ').toLowerCase();

    if (!db.get(`servers.${msg.guild.id}.logs.channel`))
      return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setlogchannel <channel>\``);

    // define regex
    const cc = /^(channel[-]?created)/gi;
    const cd = /^(channel[-]?deleted)/gi;
    const cu = /^(channel[-]?updated)/gi;
    const tc = /^(thread[-]?created)/gi;
    const td = /^(thread[-]?deleted)/gi;
    const vcc = /^((voice|v)[-]?channel[-]?created)/gi;
    const vcd = /^((voice|v)[-]?channel[-]?deleted)/gi;
    const mj = /^(member[-]?join(ed)?)/gi;
    const ml = /^(member[-]?leave)/gi;
    const me1 = /^(message[-]?edited)/gi;
    const md = /^(message[-]?deleted)/gi;
    const rc = /^(role[-]?created)/gi;
    const rd = /^(role[-]?deleted)/gi;
    const ru = /^(role[-]?updated)/gi;
    const sc = /^((stage|s)[-]?channel[-]?created)/gi;
    const sd = /^((stage|s)[-]?channel[-]?deleted)/gi;
    const su = /^((stage|s)[-]?channel[-]?updated)/gi;
    const ec = /^(emoji[-]?created)/gi;
    const ed = /^(emoji[-]?deleted)/gi;
    const bmd = /^(bulk[-]?messages[-]?deleted)/gi;
    const stc = /^(sticker[-]?created)/gi;
    const std = /^(sticker[-]?deleted)/gi;

    const errorEmbed = new EmbedBuilder().setTitle(':x: Invalid parameter.').addFields([
      {
        name: 'Valid Parameters',
        value: `
channel-created
channel-deleted
channel-updated
thread-created
thread-deleted
voice-channel-created
voice-channel-deleted
member-join
member-leave
message-edited
message-deleted
role-created
role-deleted
role-updated
stage-channel-created
stage-channel-deleted
stage-channel-updated
emoji-created
emoji-deleted
bulk-messages-deleted
sticker-created
sticker-deleted`,
        inline: true,
      },
      {
        name: 'Other Usage:',
        value: 'Log-Toggle <Enable/Disable> <Channel> to enable/disable a channel from being logged.',
        inline: false,
      },
    ]);
    if (['enable', 'disable'].includes(args?.[0]?.toLowerCase())) {
      if (args?.[0]?.toLowerCase() === 'enable') {
        // Enable channel

        let chan;
        if (!args[1]) {
          chan = msg.channel;
        } else {
          chan =
            msg.mentions.channels.first() ||
            msg.guild.channels.cache.find((c) => c.id === `${args[1]}`) ||
            msg.guild.channels.cache.find((c) => c.name.toLowerCase() === `${args[1].toLowerCase()}`) ||
            msg.guild.channels.cache.find((c) => c.name.toLowerCase().includes(`${args[1].toLowerCase()}`));
        }
        if (!chan) return msg.channel.send('I could not find a channel with that information.');

        const chans = db.get(`servers.${msg.guild.id}.logs.noLogChans`);
        if (chans && !chans.includes(chan.id)) return msg.channel.send('That channel is already enabled.');

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
          chan =
            msg.mentions.channels.first() ||
            msg.guild.channels.cache.find((c) => c.id === `${args[1]}`) ||
            msg.guild.channels.cache.find((c) => c.name.toLowerCase() === `${args[1].toLowerCase()}`) ||
            msg.guild.channels.cache.find((c) => c.name.toLowerCase().includes(`${args[1].toLowerCase()}`));
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
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.channel-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.channel-created`, 'disabled');
        msg.channel.send('Channel-Created logs has been disabled.');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.channel-created`, 'enabled');
        msg.channel.send('Channel-Created logs has been enabled.');
      }
    } else if (cd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.channel-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.channel-deleted`, 'disabled');
        msg.channel.send('Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.channel-deleted`, 'enabled');
        msg.channel.send('Channel-Deleted logs has been enabled');
      }
    } else if (cu.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.channel-updated`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.channel-updated`, 'disabled');
        msg.channel.send('Channel-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.channel-updated`, 'enabled');
        msg.channel.send('Channel-Updated logs has been enabled');
      }
    } else if (vcc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.v-channel-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.v-channel-created`, 'disabled');
        msg.channel.send('Voice-Channel-Created logs has been disabled.');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.v-channel-created`, 'enabled');
        msg.channel.send('Voice-Channel-Created logs has been enabled.');
      }
    } else if (vcd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.v-channel-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.v-channel-deleted`, 'disabled');
        msg.channel.send('Voice-Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.v-channel-deleted`, 'enabled');
        msg.channel.send('Voice-Channel-Deleted logs has been enabled');
      }
    } else if (mj.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.member-join`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.member-join`, 'disabled');
        msg.channel.send('Member-Join logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.member-join`, 'enabled');
        msg.channel.send('Member-Join logs has been enabled');
      }
    } else if (ml.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.member-leave`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.member-leave`, 'disabled');
        msg.channel.send('Member-Leave logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.member-leave`, 'enabled');
        msg.channel.send('Member-Leave logs has been enabled');
      }
    } else if (me1.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.message-edited`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.message-edited`, 'disabled');
        msg.channel.send('Message-Edited logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.message-edited`, 'enabled');
        msg.channel.send('Message-Edited logs has been enabled');
      }
    } else if (md.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.message-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.message-deleted`, 'disabled');
        msg.channel.send('Message-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.message-deleted`, 'enabled');
        msg.channel.send('Message-Deleted logs has been enabled');
      }
    } else if (rc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.role-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.role-created`, 'disabled');
        msg.channel.send('Role-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.role-created`, 'enabled');
        msg.channel.send('Role-Created logs has been enabled');
      }
    } else if (rd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.role-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.role-deleted`, 'disabled');
        msg.channel.send('Role-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.role-deleted`, 'enabled');
        msg.channel.send('Role-Deleted logs has been enabled');
      }
    } else if (ru.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.role-updated`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.role-updated`, 'disabled');
        msg.channel.send('Role-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.role-updated`, 'enabled');
        msg.channel.send('Role-Updated logs has been enabled');
      }
    } else if (sc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.stage-channel-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.stage-channel-created`, 'disabled');
        msg.channel.send('Stage-Channel-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.stage-channel-created`, 'enabled');
        msg.channel.send('Stage-Channel-Created logs has been enabled');
      }
    } else if (sd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.stage-channel-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.stage-channel-deleted`, 'disabled');
        msg.channel.send('Stage-Channel-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.stage-channel-deleted`, 'enabled');
        msg.channel.send('Stage-Channel-Deleted logs has been enabled');
      }
    } else if (su.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.stage-channel-updated`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.stage-channel-updated`, 'disabled');
        msg.channel.send('Stage-Channel-Updated logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.stage-channel-updated`, 'enabled');
        msg.channel.send('Stage-Channel-Updated logs has been enabled');
      }
    } else if (ec.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.emoji-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.emoji-created`, 'disabled');
        msg.channel.send('Emoji-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.emoji-created`, 'enabled');
        msg.channel.send('Emoji-Created logs has been enabled');
      }
    } else if (ed.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.emoji-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.emoji-deleted`, 'disabled');
        msg.channel.send('Emoji-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.emoji-deleted`, 'enabled');
        msg.channel.send('Emoji-Deleted logs has been enabled');
      }
    } else if (bmd.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.bulk-messages-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.bulk-messages-deleted`, 'disabled');
        msg.channel.send('Bulk-Messages-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.bulk-messages-deleted`, 'enabled');
        msg.channel.send('Bulk-Messages-Deleted logs has been enabled');
      }
    } else if (tc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.thread-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.thread-created`, 'disabled');
        msg.channel.send('Thread-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.thread-created`, 'enabled');
        msg.channel.send('Thread-Created logs have been enabled');
      }
    } else if (td.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.thread-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.thread-deleted`, 'disabled');
        msg.channel.send('Thread-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.thread-deleted`, 'enabled');
        msg.channel.send('Thread-Deleted logs have been enabled');
      }
    } else if (stc.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.sticker-created`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.sticker-created`, 'disabled');
        msg.channel.send('Sticker-Created logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.sticker-created`, 'enabled');
        msg.channel.send('Sticker-Created logs have been enabled');
      }
    } else if (std.test(query)) {
      if (db.get(`servers.${msg.guild.id}.logs.logSystem.sticker-deleted`) === 'enabled') {
        db.set(`servers.${msg.guild.id}.logs.logSystem.sticker-deleted`, 'disabled');
        msg.channel.send('Sticker-Deleted logs has been disabled');
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem.sticker-deleted`, 'enabled');
        msg.channel.send('Sticker-Deleted logs have been enabled');
      }
    } else {
      msg.channel.send({ embeds: [errorEmbed] });
    }
  }
}

module.exports = LogToggle;
