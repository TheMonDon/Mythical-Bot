# Mythical-Bot
<div align="center">
  <br />
  <p>
    <a href="https://cisn.xyz/support"><img src="https://img.shields.io/discord/579742127676981269?color=7289da&logo=discord&logoColor=white" alt="Discord Server" /></a>
    <img src="https://img.shields.io/github/package-json/v/TheMonDon/Mythical-Bot" alt="Bot Version" />
  </p>
</div>

Multi-utility bot including per-server economy, moderation, reminders, giveaways, tickets, logging, music, and more!

[![Fuck it Ship it](http://forthebadge.com/images/badges/fuck-it-ship-it.svg)](https://github.com/TheMonDon/Mythical-Bot) [![It Works. Why?](https://forthebadge.com/images/badges/it-works-why.svg)](https://github.com/TheMonDon/Mythical-Bot)

## Table of Contents

- [Administrator](#Administrator)
- [Bot Admin](#Bot-Admin)
- [Bot Support](#Bot-Support)
- [Economy](#Economy)
- [Fun](#Fun)
- [Games](#Games)
- [General](#General)
- [Information](#Information)
- [Items](#Items)
- [Logging](#Logging)
- [Minecraft](#Minecraft)
- [Moderator](#Moderator)
- [Music](#Music)
- [NSFW](#NSFW)
- [Owner](#Owner)
- [Search](#Search)
- [Tickets](#Tickets)

## Legend
Name | Description 
----------------|--------------
`<>` | Indicates a mandatory argument, you must provide this for the command to work
`[]` | Indicates an optional argument, you do not need to provide this for the command to work

## Administrator
Name | Description | Usage
----------------|--------------|-------
`clear-warnings` | Clear all the warnings of a specific user. | `clear-warnings <user>`
`delete-warning` | Delete a specific warnings case. | `delete-warning <caseID>`
`persistent-roles` | Enable/Disable the persistent roles system for your guild. | `persistent-roles`
`prefix` | View or change the guild prefix. | `prefix [New Prefix]`
`set` | View or change settings for your server. | `set <view/get/edit> <key> <value>`
`setup` | Setup the different systems of the bot. | `setup <system>`

## Bot Admin
Name | Description | Usage
----------------|--------------|-------
`conf` | Modify the default configuration for all guilds. | `conf <view/get/edit> <key> <value>`
`reload` | Reloads a command that has been modified. | `reload <command>`
`restart`| Restarts the bot. (Must be running in Forever or PM2) | `restart`

## Bot Support
Name | Description | Usage
----------------|--------------|-------
`global-blacklist` | Blacklist someone from using the bot | `global-blacklist <Add | Remove | Check> <User> <Reason>`


## Economy
Name | Description | Usage
----------------|--------------|-------
`add-money-role` | Add money to a role's members cash or bank balance. If the cash or bank argument isn't given, it will be added to the cash part. | `add-money-role [cash | bank] <role> <amount>`
`add-money` | Add money to a member's cash or bank balance. If the cash or bank argument isn't given, it will be added to the cash part. | `add-money [cash | bank] <member> <amount>`
`balance` | Get yours or another members balance | `balance [member]`
`blackjack` | Play a game of blackjack | `blackjack <bet>`
`clean-leaderboard` | Clean the leaderboard of users no longer in the guild | `clean-leaderboard`
`crime` | Commit a crime for a chance at some extra money | `crime`
`deposit` | Deposit your money into the bank | `deposit <amount | all>`
`economy-stats` | Get the total cash, bank, and balance of the entire economy | `economy-stats`
`give-money` | Pay another user | `give-money <user> <amount | all>`
`leaderboard` | Get the economy leaderboard | `leaderboard [page] [-cash | -bank]`
`remove-money-role` | Remove money from a roles members cash or bank balance. If the cash or bank argument isn't given, it will be removed from the cash part. | `remove-money-role [cash | bank] <role> <amount>`
`remove-money` | Remove money from a users's cash or bank balance. If the cash or bank argument isn't given, it will be removed from the cash part. | `remove-money [cash | bank] <member> <amount>`
`reset-money` | Reset the money of a user | `reset-money [user]`
`rob` | Rob another users money | `rob <user>`
`set-cooldown` | Set the cooldown of economy modules | `set-cooldown <work | rob | crime | slut | chat> <cooldown>`
`set-currency` | Sets the currency symbol | `set-currency [currency symbol]`
`set-fail-rate` | Sets the fail rate of economy commands | `set-fail-rate <crime | slut> <percentage>`
`set-fine-amount` | Sets the fine amount of the economy commands | `set-fine-amount <crime | slut | rob> <min | max> <amount>`
`set-payout` | Sets the payout of the economy commands | `set-payout <work | crime | slut | chat> <min | max> <amount>`
`set-start-balance` | Set the starting balance for the server | `set-start-balance <amount>`
`slut` | Whip it out, for some quick cash ;) | `slut`
`withdraw` | Withdraw your money from the bank | `withdraw <amount | all>`
`work` | Work for some extra money | `work`

## Fun
Name | Description | Usage
----------------|--------------|-------
`8ball` | Ask the 8ball something | `8ball <question>`
`advice` | Get a random piece of advice | `advice`
`choose` | Make the bot choose something | `choose <choice 1, choice 2...>`
`clap` | Clappify your text | `clap <text>`
`color` | Get information about a color | `color <hex, rgb, name, imageURL, attachment>`
`cow-say` | Say stuff as a cow.. moo | `cow-say <text>`
`cow` | Send a random ascii image of a cow | `cow`
`cursive` | Convert your text into cursive | `cursive <text>`
`dad-joke` | Get a random dad joke | `dad-joke`
`download-emoji` | Sends the image of the provided emojis | `download-emoji <emoji>`
`insult` | Get a random insult | `insult`
`kill` | Kill the chosen member in a funny way | `kill [member]`
`number` | Get a random fact about a number | `number <number>`
`quote` | Get a random quote | `quote`
`roast` | commands/Fun/roast.js | `roast`
`shower-thoughts` | Get a random shower thought | `shower-thoughts`

## Games
Name | Description | Usage
----------------|--------------|-------
`connect4` | Play a game of connect-four | `connect-four [opponent] <color>`
`flood-buttons` | Play a game of flood | `flood-buttons`
`flood` | Play a game of flood | `flood`
`hangman` | Play a game of hangman | `hangman`
`rock-paper-scissors` | Play a game of rock paper scissors | `rock-paper-scissors <member>`
`tic-tac-toe` | Play a game of tic-tac-toe with another user or the bot | `tic-tac-toe <member>`
`typer-competition` | See who can type the fastest | `typer-competition`
`wordle` | Play the famous wordle game | `wordle`

## General
Name | Description | Usage
----------------|--------------|-------
`bot-info` | Gives some useful bot information | `bot-info`
`grab` | Get the source code of a command | `grab [-i] <command name>`
`help` | Displays all your available commands | `help <category | command>`
`reminders` | View your reminders | `reminders [ID]`
`remindme` | Gives you a reminder | `remind-me <reminder>`
`warnings` | View all your warnings. Moderators can view others warnings | `warnings [user]`

## Giveaways
Name | Description | Usage
----------------|--------------|-------
`delete-giveaway` | Delete a giveaway | `delete-giveaway <Message ID>`
`end-giveaway` | End a giveaway | `end-giveaway <Message ID>`
`reroll-giveaway` | Reroll a giveaway' | `reroll-giveaway <Message ID>`
`start-giveaway` | Start a giveaway | `start-giveaway <Duration> <Winners> <Channel> <Prize>`

## Information
Name | Description | Usage
----------------|--------------|-------
`avatar` | Get a users avatar | `avatar <user>`
`channel-info` | Gives some useful channel information | `channel-info [channel]`
`dictionary` | Get the definition of a word from Oxford English Dictionary | `dictionary <word>`
`emojis` | Shows all the custom emojis in the server | `emojis`
`math` | Solve a math equation | `math <equation>`
`mylevel` |  Displays your permission level| `mylevel`
`perms` | List the permissions that a member or role has | `permissions [member | role]`
`role-info` | Gives some useful role information | `role-info <Role Name | Role ID | @role>`
`server-info` | Gives some useful server information | `server-info [server ID]`
`today-in-history` | Get information about a date in history | `today-in-history [month] [day]`
`user-info` | Gives some useful user information | `user-info [user]`
`weather` | Get the weather information from any city | `weather <City Name | Zip Code>`
`wikipedia` | Retrieve an article from wikipedia | `wikipedia <Search>`

## Items
Name | Description | Usage
----------------|--------------|-------
`buy-item` |  | ``
`create-item` |  | ``
`delete-item` |  | ``
`edit-item` |  | ``
`inventory` |  | ``
`sell-item` |  | ``
`store` |  | ``
`use-item` |  | ``

## Logging
Name | Description | Usage
----------------|--------------|-------
`log-system` |  | ``
`log-toggle` |  | ``
`toggle-all` |  | ``

## Minecraft
Name | Description | Usage
----------------|--------------|-------
`mc-account` |  | ``
`mc-server` |  | ``

## Moderator
Name | Description | Usage
----------------|--------------|-------
`ban` |  | ``
`blacklist` |  | ``
`emoji` |  | ``
`kick` |  | ``
`nickname` |  | ``
`purge` |  | ``
`unban` |  | ``
`warn-info` |  | ``
`warn` |  | ``

## Music
Name | Description | Usage
----------------|--------------|-------
`back` |  | ``
`clear-queue` |  | ``
`lyrics` |  | ``
`now-playing` |  | ``
`pause` |  | ``
`play` |  | ``
`queue` |  | ``
`remove` |  | ``
`repeat` |  | ``
`resume` |  | ``
`shuffle` |  | ``
`skip` |  | ``
`stop` |  | ``
`volume` |  | ``

## NSFW
[![Ages 18](http://forthebadge.com/images/badges/ages-18.svg)](https://github.com/TheMonDon/Mythical-Bot)
Name | Description | Usage
----------------|--------------|-------
`ass` |  | ``
`bdsm` |  | ``
`bikini` |  | ``
`boobs` |  | ``
`cuck` |  | ``
`cum` |  | ``
`dildo` |  | ``
`feet` |  | ``
`ginger` |  | ``
`gonewild` |  | ``
`hair` |  | ``
`hentai` |  | ``
`lesbian` |  | ``
`men` |  | ``
`milf` |  | ``
`pornhub` |  | ``
`pussy` |  | ``
`thong` |  | ``

## Owner
Name | Description | Usage
----------------|--------------|-------
`deploy` |  | ``
`eval` |  | ``
`exec` |  | ``
`npm` |  | ``

## Search
Name | Description | Usage
----------------|--------------|-------
`github` |  | ``
`movie` |  | ``
`reddit` |  | ``
`steam` |  | ``
`tv-show` |  | ``
## Tickets
Name | Description | Usage
----------------|--------------|-------
`add-member` |  | ``
`close` |  | ``
`force-close` |  | ``
`new-ticket` |  | ``
`remove-member` |  | ``
`topic` |  | ``