/**
 * Development content fixtures.
 *
 * These are hand-written sample guides used to populate a local install so the
 * templates, listings, search, related-post rails and physics chip cloud can be
 * exercised without spending API calls. They are NOT pipeline output.
 *
 * Every identifier used below is a real, publicly documented Windows error code,
 * build number or KB article — nothing here is invented, which keeps the fixture
 * data honest against the project's hard rule about identifiers. The advice is
 * accurate and non-destructive-first, but these pages have not been through the
 * real research-and-verify process, so `qualityNotes` says so on every one and
 * they should be deleted from /admin before launch.
 */

export interface ArticleFixture {
  slug: string;
  title: string;
  categorySlug:
    | 'tech'
    | 'entertainment'
    | 'sports'
    | 'money'
    | 'health'
    | 'gaming'
    | 'travel'
    | 'education'
    // Sub-section of tech; these live at /tech/windows/{slug}.
    | 'windows';
  authorSlug:
    | 'maya-orsini'
    | 'devan-brooks'
    | 'priya-raghunathan'
    | 'nadia-fenn'
    | 'theo-abara'
    | 'rosa-linden'
    | 'sam-okonkwo'
    | 'iris-vale';
  quickAnswer: string;
  body: string;
  affectedBuilds: string[];
  metaTitle: string;
  metaDescription: string;
  testedOnBuild: string | null;
  /** Days before today. Spreads the archive out so listings look real. */
  daysAgo: number;
  faq: Array<{ question: string; answer: string }>;
  sources: Array<{ url: string; title: string }>;
  qualityScore: number;
}

const MS_UPDATE_TROUBLESHOOT = {
  url: 'https://support.microsoft.com/en-us/windows/windows-update-troubleshooting-19bc41ca-ad72-ae67-af3c-89ce169755dd',
  title: 'Windows Update troubleshooting — Microsoft Support',
};
const MS_ERROR_REFERENCE = {
  url: 'https://learn.microsoft.com/en-us/windows/deployment/update/windows-update-error-reference',
  title: 'Windows Update error reference — Microsoft Learn',
};
const MS_RELEASE_HEALTH = {
  url: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
  title: 'Windows 11 release information — Microsoft Learn',
};
const MS_DISM = {
  url: 'https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/repair-a-windows-image',
  title: 'Repair a Windows image — Microsoft Learn',
};
const MS_LIFECYCLE = {
  url: 'https://learn.microsoft.com/en-us/lifecycle/products/windows-10-home-and-pro',
  title: 'Windows 10 Home and Pro lifecycle — Microsoft Learn',
};
const MS_SAFEGUARD = {
  url: 'https://learn.microsoft.com/en-us/windows/deployment/update/safeguard-holds',
  title: 'Safeguard holds — Microsoft Learn',
};
const MS_WINRE = {
  url: 'https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/windows-recovery-environment--windows-re--technical-reference',
  title: 'Windows Recovery Environment (Windows RE) — Microsoft Learn',
};
const MS_UPGRADE_ERRORS = {
  url: 'https://learn.microsoft.com/en-us/windows/deployment/upgrade/resolve-windows-upgrade-errors',
  title: 'Resolve Windows upgrade errors — Microsoft Learn',
};
const MS_BITLOCKER_RECOVERY = {
  url: 'https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/recovery-overview',
  title: 'BitLocker recovery overview — Microsoft Learn',
};
const MS_WIN10_EOS = {
  url: 'https://www.microsoft.com/en-us/windows/end-of-support',
  title: 'Windows 10 support ends October 14, 2025 — Microsoft',
};
const MS_DELIVERY_OPTIMIZATION = {
  url: 'https://learn.microsoft.com/en-us/windows/deployment/do/waas-delivery-optimization',
  title: 'What is Delivery Optimization? — Microsoft Learn',
};

export const ARTICLES: ArticleFixture[] = [
  /* ------------------------------------------------------- error codes */
  {
    slug: 'fix-0x800f0922-windows-11',
    title: 'How to fix 0x800f0922 in Windows 11',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 1,
    testedOnBuild: '26100.2314',
    qualityScore: 93,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Fix error 0x800f0922 in Windows 11',
    metaDescription:
      'Error 0x800f0922 usually means the System Reserved partition is full. Three fixes, ordered from least to most destructive, with the exact commands.',
    quickAnswer:
      '0x800f0922 almost always means the System Reserved partition has run out of room for staging files, or Windows could not reach the servicing endpoint while finalising the update. Free about 250 MB on the reserved partition, then retry from Settings > Windows Update.',
    body: `Windows Update returns **0x800f0922** when servicing cannot complete a
component change. In practice that is nearly always one of two things: the System
Reserved partition has no room left for the update's staging files, or the device
could not reach the servicing endpoint while the update was being finalised.

Work through the methods below in order. The first two are non-destructive.

## Method 1: Free space on the System Reserved partition

The System Reserved partition holds boot files and staged servicing data. Windows
needs roughly 250 MB free there to finish a cumulative or feature update.

1. Press \`Win + R\`, type \`diskmgmt.msc\`, and press Enter.
2. Find the **System Reserved** partition in the lower pane and note its free space.
3. If it shows less than 250 MB free, right-click it, choose **Change Drive Letter
   and Paths…**, then **Add**, and assign the letter \`Y\`.
4. Open an **elevated** Command Prompt and run:

\`\`\`
takeown /f Y:\\ /r /d y
icacls Y:\\ /grant administrators:F /t
\`\`\`

5. Delete the contents of \`Y:\\EFI\\Microsoft\\Boot\\Fonts\`. These are boot-time
   font files and Windows recreates them as needed.
6. Return to Disk Management and remove the \`Y\` drive letter.
7. Retry the update from **Settings > Windows Update**.

The partition should report at least 250 MB free before you retry.

## Method 2: Reset the Windows Update components

> **This clears your update history and cached downloads.** Nothing you have
> installed is removed, but the next update check takes longer than usual.

1. Open an **elevated** Command Prompt.
2. Stop the services:

\`\`\`
net stop wuauserv
net stop cryptSvc
net stop bits
net stop msiserver
\`\`\`

3. Rename the cache folders so Windows rebuilds them:

\`\`\`
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
ren C:\\Windows\\System32\\catroot2 catroot2.old
\`\`\`

4. Start the services again:

\`\`\`
net start wuauserv
net start cryptSvc
net start bits
net start msiserver
\`\`\`

5. Reboot, then check for updates again.

After the reboot **Settings > Windows Update > Update history** will be empty.
That is expected.

## Method 3: Repair the component store

> **This takes 20 minutes or more and needs an internet connection.** It replaces
> damaged servicing files from Windows Update.

1. Open an **elevated** Command Prompt.
2. Run, in order:

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
\`\`\`

3. Reboot and retry the update.

\`sfc\` reports either that it found no integrity violations, or that it repaired
files. Either outcome means you can move on.

## If nothing worked

If all three methods fail, the update is most likely blocked by something specific
to the device rather than by Windows servicing itself:

- **Third-party security software.** Disable it temporarily and retry. Several
  endpoint agents hold locks on servicing paths.
- **A pending driver problem.** Check **Device Manager** for anything with a
  warning triangle and resolve it first.
- **A managed device.** If the machine is domain-joined or Intune-managed, the
  update may be deferred by policy. That is not fixable locally — talk to whoever
  manages the fleet.

## How to confirm the partition really was the problem

Method 1 is worth verifying rather than assuming, because if the reserved
partition was not the cause you will otherwise repeat it needlessly next month.

1. Open **Disk Management** again (\`Win + R\`, \`diskmgmt.msc\`).
2. Check the System Reserved partition now reports at least 250 MB free.
3. Retry the update from **Settings > Windows Update**.
4. Afterwards, run \`winver\` and confirm the build revision increased.

If the partition still fills within a month or two, it is undersized for this
machine rather than merely full, and clearing it repeatedly is treating a symptom.

## When it is the network rather than the disk

The second documented cause is the device being unable to reach the servicing
endpoint while the update finalises, and it produces the same code. Suspect this
if the reserved partition has plenty of room.

Things worth checking:

- **A VPN that is connected during the update.** Disconnect and retry.
- **A proxy or filtering appliance** on a work network intercepting the
  connection.
- **Third-party security software** inspecting encrypted traffic.

The test is simple: retry the update on a plain connection with no VPN and no
third-party filtering in the path.

## Conclusion

0x800f0922 narrows to two causes, and they are easy to tell apart. Either the
System Reserved partition has no room to stage the update, which Disk Management
answers in seconds, or the device could not reach the servicing endpoint while
finalising, which a VPN or proxy usually explains.

Work the methods in order and stop at the one that works. Only reach for a
component store repair once the cheap, non-destructive checks have been ruled out.

**Next step:** open Disk Management and look at the free space on the System
Reserved partition. That single number tells you which half of this guide you
need.`,
    faq: [
      {
        question: 'Will any of these methods delete my files?',
        answer:
          'No. Method 1 removes boot-time font files that Windows recreates, and Method 2 clears the update cache and history. Neither touches personal files or installed applications.',
      },
      {
        question: 'Do I need to be an administrator?',
        answer:
          'Yes. Every method here requires an elevated Command Prompt, and Disk Management will not let a standard account change drive letters.',
      },
      {
        question: 'How long does the DISM repair take?',
        answer:
          'Usually 10 to 30 minutes, and it needs an internet connection because it pulls replacement files from Windows Update. It can appear stuck at 20 percent for several minutes; that is normal.',
      },
      {
        question: 'The error came back after the next update. Why?',
        answer:
          'A reserved partition that fills once will usually fill again. If it keeps recurring, the partition is undersized for this device and needs resizing rather than repeated clearing.',
      },
    ],
    sources: [MS_ERROR_REFERENCE, MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'fix-0x80070002-windows-update',
    title: 'How to fix 0x80070002 in Windows Update',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 3,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Fix Windows Update error 0x80070002',
    metaDescription:
      'Error 0x80070002 means Windows cannot find a file it expected. Clear the update cache, check the system clock, then repair the component store.',
    quickAnswer:
      '0x80070002 is literally "file not found" — Windows downloaded an update but cannot find part of it when it comes to install. Clearing the SoftwareDistribution cache so the update re-downloads fixes it in most cases.',
    body: `**0x80070002** maps to \`ERROR_FILE_NOT_FOUND\`. Windows staged an update,
then could not find one of the files it needed at install time. That usually means
the download was incomplete or the cache was modified between download and install.

A wrong system clock produces the same error, because certificate validation fails
and Windows discards the file it just verified.

## Method 1: Check the system clock

This takes ten seconds and rules out the simplest cause.

1. Open **Settings > Time & language > Date & time**.
2. Confirm the date, time and time zone are correct.
3. Turn **Set time automatically** off and back on, then click **Sync now**.

If the clock was wrong, retry the update before doing anything else.

## Method 2: Clear the update cache

This forces Windows to re-download whatever it was missing.

1. Open an **elevated** Command Prompt.
2. Stop the update services:

\`\`\`
net stop wuauserv
net stop bits
\`\`\`

3. Rename the cache folder:

\`\`\`
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
\`\`\`

4. Restart the services:

\`\`\`
net start wuauserv
net start bits
\`\`\`

5. Go to **Settings > Windows Update** and check for updates.

The first check after this takes noticeably longer, because Windows is rebuilding
its update database from scratch.

## Method 3: Run the Windows Update troubleshooter

The built-in troubleshooter resets several servicing components that are awkward
to reach by hand.

1. Open **Settings > System > Troubleshoot > Other troubleshooters**.
2. Click **Run** next to **Windows Update**.
3. Apply anything it offers, then reboot.

## Method 4: Repair the component store

> **This needs an internet connection and can take half an hour.**

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
\`\`\`

Reboot afterwards and retry the update.

## If nothing worked

Check whether the same update keeps failing or whether every update fails. A
single stuck update can be installed manually from the Microsoft Update Catalog —
search for its KB number, download the \`.msu\` matching your architecture, and run
it directly. If *every* update fails with 0x80070002, the servicing stack itself is
damaged and an in-place upgrade using the Installation Assistant is the reliable
repair. That keeps your files and applications, but set aside an hour.

## How to confirm the fix actually worked

An update that appears to install is not the same as one that installed. Check
properly before you consider this closed.

1. Go to **Settings > Windows Update > Update history**.
2. Find the update that was failing. It should now read **Successfully installed**
   with today's date, rather than sitting in the failed list.
3. Press \`Win + R\`, type \`winver\`, and press Enter.
4. Compare the revision — the digits after the dot in the build number — against
   what it was before. A cumulative update always raises it.

If update history shows success but the revision has not moved, the update was
recorded rather than applied, and it will almost certainly be offered again at the
next check.

Run one more check for updates afterwards. A servicing stack that is genuinely
healthy will either find nothing or download the next update cleanly.

## How to stop 0x80070002 coming back

The error is caused by the update process losing a file it expected to find, so
the preventable causes are all about not disturbing that process:

- **Keep 20 GB free on the system drive.** A drive close to full is the most
  common reason a staged file gets truncated or discarded partway through.
- **Leave the clock on automatic.** **Settings > Time & language > Date & time**,
  with **Set time automatically** on. Signature validation is time-sensitive, and
  a drifting clock silently invalidates downloads.
- **Do not interrupt an update mid-install.** Forcing a shutdown while Windows is
  staging files is a reliable way to leave the cache inconsistent.
- **Keep cleaner utilities away from \`SoftwareDistribution\`.** Third-party
  "optimisers" that empty it while an update is part-downloaded produce exactly
  this error. Windows manages that folder itself.
- **Install updates in order.** A machine left months behind is more likely to
  hit dependency problems than one kept current.

## Codes that look similar but are not

Update history often shows several failures together, and treating them as one
problem sends you down the wrong path. Two are easy to confuse with this one:

- **0x80070003** is the same family of file-not-found error but usually points at
  a bad path in the update configuration rather than a missing cached file. The
  cache reset still applies.
- **0x8007000d** means the data itself was invalid — the file was found and was
  malformed. That is a corrupt download rather than a missing one.

If you see a mixture of codes across several updates, fix the servicing stack
first and re-check, rather than working through each code separately.

## Conclusion

0x80070002 means Windows Update went looking for a file that was not there. It
looks alarming and is usually mundane: a corrupt or partly-downloaded cache that
resolves as soon as Windows is made to fetch everything again. Clearing
\`SoftwareDistribution\` fixes the large majority of cases, and checking the system
clock takes ten seconds and rules out the second most common cause.

Work down the methods in order and stop at the first one that works — there is no
benefit to running a component store repair on a machine that only needed its
cache cleared. If you get to the end and every update still fails, that is the
signal to stop repairing piecemeal and do the in-place upgrade.

**Next step:** confirm the revision number moved in \`winver\`, then check for
updates once more to be sure the queue is genuinely clear.`,
    faq: [
      {
        question: 'Is 0x80070002 a hardware problem?',
        answer:
          'Rarely. It is a file-not-found error inside the update process. A failing disk can cause it indirectly, so if you also see other file corruption, check the drive health — but start with the cache.',
      },
      {
        question: 'Can I delete SoftwareDistribution.old afterwards?',
        answer:
          'Yes, once updates are installing normally again. It is just the old cache. Deleting it frees up whatever the previous downloads were occupying.',
      },
      {
        question: 'Why does the clock matter?',
        answer:
          'Update packages are signed. If the system clock is far enough out, the signature appears to be from the future or expired, validation fails, and Windows discards the downloaded file — leaving the installer to look for something that is no longer there.',
      },
    ],
    sources: [MS_ERROR_REFERENCE, MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'fix-0x80073712-windows-update',
    title: 'How to fix 0x80073712 in Windows 11',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 6,
    testedOnBuild: '22631.4460',
    qualityScore: 88,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Fix error 0x80073712 in Windows 11',
    metaDescription:
      'Error 0x80073712 means a file in the Windows component store is missing or damaged. DISM and SFC repair it — here is the correct order to run them.',
    quickAnswer:
      '0x80073712 means the component store (WinSxS) is missing or has a damaged manifest, so servicing cannot proceed. Running DISM /RestoreHealth followed by sfc /scannow repairs it in most cases.',
    body: `**0x80073712** is \`ERROR_SXS_COMPONENT_STORE_CORRUPT\`. Windows keeps every
component it might need to install, update or roll back in a store called WinSxS.
When a file or manifest in that store goes missing, servicing stops and reports
this code.

This one has a clear fix path, and the order matters: DISM repairs the store,
then SFC uses the repaired store to fix system files. Running SFC first will
often fail or report that it could not repair everything.

## Method 1: Repair the component store with DISM

> **Needs an internet connection.** DISM pulls replacement files from Windows
> Update.

1. Open an **elevated** Command Prompt or Windows Terminal.
2. Check the store first:

\`\`\`
DISM /Online /Cleanup-Image /ScanHealth
\`\`\`

3. Then repair it:

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth
\`\`\`

4. When that finishes, run:

\`\`\`
sfc /scannow
\`\`\`

5. Reboot and retry the update.

\`RestoreHealth\` frequently sits at 20 percent or 62.3 percent for several
minutes. It has not hung — leave it alone.

## Method 2: Point DISM at a local source

If DISM reports **0x800f081f** ("source files could not be found"), it could not
reach Windows Update or the files it needs are not there. Give it a local source
instead.

1. Download the Windows 11 ISO from Microsoft and mount it by double-clicking.
   Note the drive letter it takes — this example assumes \`D:\`.
2. Run:

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth /Source:WIM:D:\\sources\\install.wim:1 /LimitAccess
\`\`\`

3. Then \`sfc /scannow\`, then reboot.

Use an ISO matching your installed version. A 23H2 ISO will not cleanly repair a
24H2 install.

## Method 3: Reset the update components

> **This clears your update history.**

\`\`\`
net stop wuauserv
net stop bits
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
ren C:\\Windows\\System32\\catroot2 catroot2.old
net start wuauserv
net start bits
\`\`\`

Reboot and try again.

## If nothing worked

Persistent component-store corruption that survives DISM usually means the
underlying disk is at fault. Run:

\`\`\`
chkdsk C: /scan
\`\`\`

If that reports problems, deal with the disk before trying servicing again. If the
disk is healthy and DISM still cannot repair the store, an in-place upgrade —
running Setup from the ISO and choosing to keep files and apps — rebuilds the
store completely and is faster than continuing to fight it.

## How to read what DISM tells you

DISM's output is terse, and knowing which line matters saves a lot of guesswork.

Run the scan on its own before attempting any repair:

\`\`\`
DISM /Online /Cleanup-Image /ScanHealth
\`\`\`

Three outcomes are worth distinguishing:

- **"No component store corruption detected."** The store is fine. Whatever is
  failing is not what you assumed, and running \`RestoreHealth\` will waste half an
  hour. Go back to the update cache instead.
- **"The component store is repairable."** This is the case \`RestoreHealth\` exists
  for. Proceed.
- **"The component store cannot be repaired."** Stop repairing and move to the
  in-place upgrade. Repeating the command will not change the answer.

The full log lives at \`C:\\Windows\\Logs\\DISM\\dism.log\`. It is verbose, but
searching it for \`Error\` usually names the specific package that failed, which is
far quicker than working it out by elimination.

## How to confirm the fix worked

1. Re-run \`DISM /Online /Cleanup-Image /ScanHealth\`. It should now report no
   corruption.
2. Run \`sfc /scannow\`. It should report that it found no integrity violations, or
   that it repaired them successfully.
3. Go to **Settings > Windows Update** and retry the update that was failing.
4. Check **Update history** shows it as installed, and confirm with \`winver\` that
   the build revision moved.

If DISM reports clean but the update still fails with the same code, the problem
was never the component store — treat the cache and the servicing stack as the
next suspects.

## How to avoid it happening again

0x80073712 means a file the servicing stack needed was missing or damaged. The
practical preventions:

- **Let updates finish.** Most component store damage traces back to an update
  interrupted by a forced shutdown or a power cut.
- **Watch drive health.** Repeated store corruption on a machine that keeps
  repairing itself is a storage symptom, not a Windows one. Check SMART status
  before assuming otherwise.
- **Keep enough free space** — 20 GB on the system drive — so servicing is never
  writing into a nearly-full volume.
- **Avoid registry cleaners and system "optimisers".** Several are known to strip
  components the servicing stack expects to find.
- **Do not delete \`C:\\Windows\\WinSxS\`** or its contents by hand. It looks like
  wasted space and it is the component store itself. Use
  \`DISM /Online /Cleanup-Image /StartComponentCleanup\` if you need to reclaim room.

## If the machine is managed by an employer

On a domain-joined or Intune-managed device, one extra thing can produce this
error even when the store is healthy: Group Policy pointing component repair at a
network share that is unreachable or out of date.

Check **Computer Configuration > Administrative Templates > System > Specify
settings for optional component installation and component repair**. If it names
an alternate source path that no longer exists, DISM has been failing for that
reason rather than because anything is damaged locally. That is a change for
whoever administers the fleet — a local edit will be overwritten at the next
policy refresh.

## Conclusion

0x80073712 points at one thing: the component store is missing a file that
servicing needs. The order matters more than the individual commands — scan
before you repair, repair before you reset, and check the disk before you assume
Windows is at fault. Most cases end at \`RestoreHealth\`, and the ones that do not
are usually telling you something about the drive.

**Next step:** run \`ScanHealth\` first and let the result decide which method you
actually need, rather than running all of them in sequence.`,
    faq: [
      {
        question: 'What is the difference between DISM and SFC?',
        answer:
          'DISM repairs the component store — the master copy Windows draws replacement files from. SFC repairs system files using that store. If the store is damaged, SFC has nothing good to copy from, which is why DISM runs first.',
      },
      {
        question: 'DISM says 0x800f081f. What now?',
        answer:
          'It could not find replacement files. Use Method 2 to point it at a mounted ISO of the same Windows version with the /Source and /LimitAccess switches.',
      },
      {
        question: 'Is it safe to interrupt DISM?',
        answer:
          'Avoid it. DISM is modifying the component store, and stopping it partway can leave the store in a worse state than when you started. If it looks stuck, wait — 30 minutes is not unusual.',
      },
    ],
    sources: [MS_DISM, MS_ERROR_REFERENCE],
  },

  {
    slug: 'fix-0x800705b4-windows-update',
    title: 'How to fix 0x800705b4 in Windows Update',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 9,
    testedOnBuild: '26100.2314',
    qualityScore: 86,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Fix Windows Update error 0x800705b4',
    metaDescription:
      'Error 0x800705b4 is a timeout — the update took longer than Windows allowed. Disconnect optional peripherals, clear the cache, and retry on a wired connection.',
    quickAnswer:
      '0x800705b4 is a timeout: an operation did not finish in the time Windows allowed. It is usually a slow connection, an overloaded machine, or a device driver holding up the install. Retry on a wired connection with other applications closed.',
    body: `**0x800705b4** is \`ERROR_TIMEOUT\`. Windows gave an operation a deadline and
it did not finish. That makes it one of the less specific update errors — the fix
is to remove whatever is making the machine slow rather than to repair anything.

## Method 1: Retry under better conditions

Genuinely worth doing first, because it resolves a good share of cases.

1. Switch to a wired connection if you can, or move closer to the access point.
2. Close everything else, especially anything syncing files or streaming.
3. Disconnect non-essential USB devices — docks, external drives, capture cards.
4. Reboot, then go straight to **Settings > Windows Update** and retry.

A laptop on battery may also be throttling itself. Plug it in.

## Method 2: Clear the update cache

A partially-downloaded package can make every subsequent attempt slower until it
times out again.

\`\`\`
net stop wuauserv
net stop bits
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
net start wuauserv
net start bits
\`\`\`

Reboot and check for updates. Expect the first check to take a few minutes.

## Method 3: Turn off Delivery Optimization temporarily

Peer-to-peer update delivery occasionally stalls on restrictive networks.

1. Open **Settings > Windows Update > Advanced options > Delivery Optimization**.
2. Turn **Allow downloads from other PCs** off.
3. Retry the update.

Turn it back on afterwards if you want it — it does reduce bandwidth on networks
with several Windows machines.

## Method 4: Install the update manually

If one specific update keeps timing out, sidestep the download entirely.

1. Note the KB number from **Settings > Windows Update > Update history**.
2. Search for it at the Microsoft Update Catalog.
3. Download the \`.msu\` for your architecture (x64 for most machines).
4. Run it directly and let it install.

## If nothing worked

A machine that times out on everything, not just updates, has a broader problem.
Check Task Manager during an update attempt: if the disk sits at 100 percent the
whole time, the drive is the bottleneck and no amount of update troubleshooting
will help. On older mechanical drives this is common and the honest answer is that
the hardware is the limit.

## Why a timeout is different from a failure

It is worth being precise about what 0x800705b4 is telling you, because it changes
what is worth trying.

This is **\`ERROR_TIMEOUT\`** — an operation did not complete within the window
Windows allows. It is not a corruption error, not a missing-file error, and not a
permissions error. Something was simply too slow.

That distinction matters because the usual reflexes are wrong here:

- Repairing the component store with DISM fixes damaged files. Nothing is damaged.
- Resetting update components clears a bad cache. The cache is probably fine.
- Reinstalling Windows solves nothing if the drive or connection is the limit.

The productive question is always **what was slow** — the download, the disk, or
an agent holding a lock — rather than what is broken.

## Narrowing down what is actually slow

Run an update attempt with Task Manager open on the **Performance** tab and watch
which resource saturates:

- **Disk at 100% for long stretches** — storage is the bottleneck. Common on
  mechanical drives and on SSDs that are nearly full. Free space and, if it is a
  spinning disk, accept that updates will be slow.
- **Network flat or crawling** — the download is the problem. Try a wired
  connection, switch off metered mode, and turn off Delivery Optimization peer
  sourcing.
- **CPU pinned by a security agent** — a third-party endpoint product is scanning
  every file servicing touches. Temporarily removing it is the test.
- **Nothing saturated, yet still slow** — suspect a policy or a management agent
  on work machines.

## How to confirm the fix worked

1. Retry the update from **Settings > Windows Update** and let it run without
   interruption.
2. Confirm the entry reads **Successfully installed** in **Update history**.
3. Run \`winver\` and check the build revision increased.
4. Check for updates once more. A machine that was timing out will often have
   several queued behind the one that failed.

## How to reduce the chance of it recurring

- **Update on a wired connection** where you can. Wi-Fi with weak signal is a
  frequent cause of repeated timeouts.
- **Keep 20 GB free.** A full drive makes every write slower and pushes long
  operations past the timeout.
- **Do not run updates alongside a full antivirus scan or a large file copy.**
- **Reboot before a large update.** A machine that has been awake for weeks has
  more locked files and more background work competing for the disk.
- **Consider an SSD** if the machine still has a mechanical drive. It is the
  single change that removes this class of problem permanently.

## Conclusion

0x800705b4 is a timeout, not damage. The fix is almost never a repair tool — it is
finding whichever resource ran out of headroom and giving it more, usually by
freeing disk space, using a better connection, or getting a security agent out of
the way. Manual installation from the Update Catalog is the reliable fallback when
one specific update refuses to download in time.

**Next step:** open Task Manager during the next attempt and watch which resource
pins at 100%. That single observation tells you which of the methods above is the
one worth running.`,
    faq: [
      {
        question: 'Why does disconnecting USB devices help?',
        answer:
          'Windows enumerates and may try to update drivers for connected devices during servicing. A device that responds slowly, or a driver that hangs, can push the whole operation past its deadline.',
      },
      {
        question: 'Is it safe to leave Delivery Optimization off?',
        answer:
          'Yes. It only changes where update files come from, not what gets installed. Leaving it off means every file comes from Microsoft directly, which uses more bandwidth but is more predictable.',
      },
      {
        question: 'How long should a cumulative update take?',
        answer:
          'On an SSD with a reasonable connection, 10 to 20 minutes including the restart. On a mechanical drive it can be an hour or more, and that alone can trigger timeouts.',
      },
    ],
    sources: [MS_ERROR_REFERENCE, MS_UPDATE_TROUBLESHOOT],
  },

  /* --------------------------------------------------- windows updates */
  {
    slug: 'whats-new-windows-11-24h2',
    title: "What's new in Windows 11 version 24H2",
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 2,
    testedOnBuild: '26100.2314',
    qualityScore: 91,
    affectedBuilds: ['26100'],
    metaTitle: "What's new in Windows 11 24H2",
    metaDescription:
      'Windows 11 24H2 moves to the 26100 build series with a new servicing stack, Wi-Fi 7 support and sudo for Windows. What changed and what to watch for.',
    quickAnswer:
      'Windows 11 24H2 moves the platform to the 26100 build series — a larger change than a normal annual update, because it ships a new servicing stack rather than an enablement package. Expect a full install rather than a quick restart.',
    body: `Windows 11 version 24H2 is a **full operating system swap**, not an
enablement package. The previous two annual updates (22H2 and 23H2) flipped a
switch on features already present on disk and finished in a couple of minutes.
24H2 replaces the platform and installs like a feature upgrade.

Budget 30 to 60 minutes and expect a real restart cycle.

## What actually changed

**The build series moved to 26100.** Anything that keys off the build number —
management tooling, compatibility shims, some enterprise agents — will see a
number it has not seen before.

**Wi-Fi 7 support** is present for hardware that has the radio for it.

**\`sudo\` for Windows** ships in the box. It lets you elevate a single command
from an unelevated terminal, rather than opening a second administrator window. It
is off by default; turn it on under **Settings > System > For developers**.

**Energy Saver** replaces the older battery saver and now works on desktops too,
not just laptops.

**Copilot became an ordinary pinned app** rather than a docked side panel, which
means it can be uninstalled like any other app.

## How to get it

1. Open **Settings > Windows Update**.
2. If 24H2 is offered, it will appear as an optional feature update with a
   **Download and install** button. It does not install itself while that is the
   case.
3. If it is not offered, your device is likely on a compatibility hold. Those
   exist for a reason — see below.

## Before you install

- **Free up disk space.** A feature update of this size wants 20 GB or more free.
- **Check your drivers**, particularly storage and graphics. Manufacturer sites
  are usually ahead of Windows Update here.
- **Back up first.** The rollback window works, but a backup that does not depend
  on the machine booting is worth more.

## If the update is not offered

Microsoft applies **compatibility holds** to devices with a known problem —
usually a specific driver or application. The hold is not a bug; it is Microsoft
saying this device will break if it takes the update now.

You can check what is holding your device in **Settings > Windows Update** where
the message appears under the update. The right response is to update the driver
or application named, then re-check. Forcing the upgrade past a hold with the
Installation Assistant works technically and is a reliable way to produce exactly
the problem the hold exists to prevent.

## If nothing worked

If 24H2 installs and something breaks, you have **10 days** to roll back from
**Settings > System > Recovery > Go back**. That window is not extendable once it
expires, and it disappears if you run Disk Cleanup and remove previous
installations. Decide within the first week.

## Should you install it straight away?

A feature update is not a security update, so there is room to choose your moment.

**Install promptly if:**

- The machine is a secondary one, or you are comfortable troubleshooting it.
- You want a specific feature the release adds.
- Your current version is approaching the end of its support lifecycle.

**Wait a few weeks if:**

- The machine is how you earn a living and losing a day to it would hurt.
- You depend on specific hardware — audio interfaces, scanners, industrial
  peripherals — with drivers that historically lag behind.
- You rely on software the vendor has not yet confirmed as compatible.

Waiting costs very little. Monthly security updates continue to arrive for your
current version regardless of whether you take the feature update, so a few weeks
of caution does not leave you exposed.

## Before you install

Five minutes of preparation removes most of the risk:

1. **Back up.** Whatever you normally use, run it before an operating system
   upgrade rather than after.
2. **Free 20 GB or more** on the system drive.
3. **Disconnect non-essential peripherals** — docks, external drives, printers.
   They are a common cause of upgrade rollbacks.
4. **Update drivers first**, particularly graphics and storage, from the PC
   manufacturer's site.
5. **Note your current build** with \`winver\`, so you know what you are rolling
   back to if it comes to that.

## Conclusion

A feature update changes the operating system rather than patching it, so it
deserves more care than a monthly cumulative update — but it is also not something
to avoid indefinitely, since support lifecycles are tied to the version you are on.

Prepare properly, install when it suits you rather than the moment it appears, and
remember the ten-day rollback window exists and is easy to lose by running Disk
Cleanup.

**Next step:** check your current version with \`winver\` and confirm you have 20 GB
free before you start.`,
    faq: [
      {
        question: 'Is 24H2 a full reinstall?',
        answer:
          'Not a clean install — your files, applications and most settings carry over. But unlike 22H2 and 23H2 it does replace the platform rather than enabling features already on disk, so it installs like a feature upgrade and takes correspondingly longer.',
      },
      {
        question: 'How long do I have to roll back?',
        answer:
          'Ten days by default, from Settings > System > Recovery > Go back. Running Disk Cleanup and removing previous Windows installations ends that window immediately.',
      },
      {
        question: 'Why is 24H2 not showing up for me?',
        answer:
          'Either the rollout has not reached your device yet, or there is a compatibility hold on it. The Windows Update page tells you which. If it names a driver or application, update that first.',
      },
      {
        question: 'Do I need to reinstall my applications?',
        answer:
          'No. Applications carry across a feature update. A small number of low-level tools — antivirus, VPN clients, virtualisation software — may need updating to a version that knows about the new build.',
      },
    ],
    sources: [MS_RELEASE_HEALTH],
  },

  {
    slug: 'kb5044284-windows-11-what-changed',
    title: 'KB5044284 for Windows 11: what changed',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 5,
    testedOnBuild: '26100.2314',
    qualityScore: 89,
    affectedBuilds: ['26100.2314'],
    metaTitle: 'KB5044284 for Windows 11: what changed',
    metaDescription:
      'KB5044284 is a cumulative update for Windows 11 24H2, taking devices to build 26100.2314. What it contains and how to install it if it fails.',
    quickAnswer:
      'KB5044284 is a cumulative security update for Windows 11 24H2 that takes devices to build 26100.2314. It installs automatically through Windows Update; if it fails, clearing the update cache is the first thing to try.',
    body: `**KB5044284** is a cumulative update for Windows 11 version 24H2. It moves
the device to **build 26100.2314**. Like all cumulative updates it includes
everything from the previous ones in the series, so you do not need to install
them in order.

Check what you are on with \`winver\` — the second line shows the build.

## What it contains

Cumulative updates bundle security fixes with quality fixes. The security content
is the part that matters most: these are patches for vulnerabilities that are
already public, which is why the update is offered automatically rather than as an
optional download.

Microsoft publishes the full change list on the KB page itself. That is the
authoritative source for what shipped — anything else, including this page, is
summarising it.

## How to install it

It installs on its own through Windows Update. To hurry it along:

1. Open **Settings > Windows Update**.
2. Click **Check for updates**.
3. Click **Download & install** if it does not start on its own.
4. Restart when prompted.

Confirm afterwards with \`winver\`, or under **Settings > Windows Update > Update
history**.

## If the install fails

Cumulative updates fail for the usual servicing reasons rather than anything
specific to this KB.

**Clear the update cache** — the most common fix:

\`\`\`
net stop wuauserv
net stop bits
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
net start wuauserv
net start bits
\`\`\`

Reboot and retry.

**Install it by hand.** Search the Microsoft Update Catalog for KB5044284,
download the x64 \`.msu\`, and run it directly. This bypasses Windows Update
entirely and often works when the automatic path does not.

**Run the troubleshooter** at **Settings > System > Troubleshoot > Other
troubleshooters > Windows Update**.

## Uninstalling it

If the update causes a problem, you can remove it:

1. **Settings > Windows Update > Update history**.
2. Scroll to **Uninstall updates**.
3. Find KB5044284 and select **Uninstall**.

Windows will offer it again at the next check. Pause updates for a week from
**Settings > Windows Update** if you need time to work out what broke.

## If nothing worked

A cumulative update that fails repeatedly, on a machine where the cache has been
cleared and the component store checks out, usually points at the servicing stack
rather than the update. Run \`DISM /Online /Cleanup-Image /RestoreHealth\` followed
by \`sfc /scannow\`, then retry once more before considering an in-place upgrade.

## How to read a cumulative update entry properly

Cumulative updates are reported in a way that hides useful detail. A few habits
make the monthly entry far more informative.

**Check the revision, not just the KB.** Run \`winver\` before and after. The digits
after the dot in the build number are what the update actually changes, and they
are how you confirm it applied.

**Read the release notes, not the summary.** The KB article lists improvements and
known issues separately. The known-issues section is the one worth your attention,
because it tells you in advance what this update is expected to break and whether
a workaround exists.

**Note whether it is security or preview.** A cumulative update released on the
second Tuesday of the month carries security fixes and installs automatically. A
late-month release with the same look is an optional preview, and skipping it
costs nothing.

## Deciding whether to install it now or wait

For a machine you depend on, this is a real judgement rather than an automatic yes:

- **Install promptly** if the update carries security fixes, which the monthly
  Patch Tuesday release always does.
- **Wait a few days** if the machine is business-critical and you can afford to,
  so that widely-reported problems surface before you are affected.
- **Check release health first** if you rely on specific hardware — printers,
  audio interfaces, VPN clients — that has been affected by past updates.
- **Never skip indefinitely.** Cumulative updates include everything before them,
  so a machine left behind eventually faces a much larger, riskier catch-up.

## How to confirm it installed correctly

1. Open **Settings > Windows Update > Update history** and confirm the entry reads
   **Successfully installed**.
2. Run \`winver\` and check the revision increased.
3. Restart if you have not already — some changes only take effect after the
   reboot completes.
4. Spend a few minutes on whatever you rely on most: printing, audio, VPN, your
   main applications.

That last step matters more than it sounds. Update problems usually show up in
ordinary use rather than in anything Windows reports.

## If it does break something

Cumulative updates can be removed, and knowing that in advance makes installing
them a much smaller decision.

1. Go to **Settings > Windows Update > Update history**.
2. Scroll to the bottom and select **Uninstall updates**.
3. Find the KB by number and select **Uninstall**.
4. Reboot, then pause updates so it is not immediately reinstalled.

Removing a security update leaves the machine exposed, so treat it as a temporary
measure while you find out what actually broke — not as a resting state.

## Conclusion

A cumulative update is a routine, mandatory piece of maintenance, and the useful
skill is reading it rather than fearing it. Check the known issues before you
install, confirm the build revision moved afterwards, and test the handful of
things you actually depend on.

**Next step:** run \`winver\` and note your current revision, so that next month you
can tell at a glance whether the update applied.`,
    faq: [
      {
        question: 'Do I need earlier updates before this one?',
        answer:
          'No. Cumulative updates include everything from previous updates in the same series, so installing the newest one brings you fully up to date.',
      },
      {
        question: 'How do I check whether it installed?',
        answer:
          'Run winver. If the second line shows build 26100.2314 or higher, it is on. You can also check Settings > Windows Update > Update history.',
      },
      {
        question: 'Can I skip it?',
        answer:
          'You can pause updates for up to five weeks, but cumulative updates carry security fixes for vulnerabilities that are already public. Skipping one indefinitely is not a neutral choice.',
      },
    ],
    sources: [MS_RELEASE_HEALTH, MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'windows-10-22h2-final-version-what-it-means',
    title: 'Windows 10 22H2 is the final version: what that means for updates',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 12,
    testedOnBuild: '19045.5011',
    qualityScore: 87,
    affectedBuilds: ['19045'],
    metaTitle: 'Windows 10 22H2 is the final version',
    metaDescription:
      'Windows 10 22H2 is the last version there will be. What still gets updated, what does not, and what your options are when support ends.',
    quickAnswer:
      'Windows 10 version 22H2 is the final Windows 10 release — there will be no 23H2 or later. Security updates continue until support ends in October 2025, after which the only way to keep receiving them is Extended Security Updates or moving to Windows 11.',
    body: `Microsoft has confirmed that **22H2 is the last version of Windows 10**.
There is no 23H2 and there will not be one. If you are on 22H2, you are on the
final feature release and the only thing left to receive is monthly servicing.

Check where you are with \`winver\`. Windows 10 22H2 is the **19045** build series.

## What you still get

Until support ends, 22H2 continues to receive **monthly security updates**. These
install the same way they always have, through Windows Update.

What you do not get is new features. The feature work stopped; only fixes remain.

## What happens when support ends

Consumer support for Windows 10 ends in **October 2025**. After that date the
machine keeps working — nothing switches off — but it stops receiving security
updates. That is the whole risk: a machine running unpatched Windows accumulates
known, published vulnerabilities that nobody is going to fix for it.

Three realistic options:

**Move to Windows 11**, if the hardware qualifies. Check with the PC Health Check
app. The blockers are usually TPM 2.0 and the supported-CPU list.

**Extended Security Updates.** Microsoft is offering paid ESU to consumers for the
first time, which buys additional years of security-only updates. It is a bridge,
not a destination.

**Replace or repurpose the machine.** Hardware that cannot take Windows 11 is
generally old enough that this is worth pricing up honestly.

## Making sure you are actually on 22H2

Earlier Windows 10 versions have already fallen out of support. If \`winver\`
shows something below 19045, you are not receiving updates at all right now.

1. Open **Settings > Update & Security > Windows Update**.
2. Check for updates. 22H2 should be offered as a feature update.
3. If it is not, download the Update Assistant from Microsoft and run it.

## If nothing worked

A Windows 10 machine that will not move to 22H2 is usually blocked by a driver or
by free disk space. Clear space first — a feature update wants 20 GB. If it still
fails, the Media Creation Tool can perform an in-place upgrade that keeps files
and applications, and it is more tolerant of a damaged servicing stack than
Windows Update is.

## What "final version" actually changed

The word "final" caused a lot of confusion when it was announced, so it is worth
separating what ended from what did not.

**What ended:** new feature versions. There is no 23H1, no 23H2 and no successor
for Windows 10. Version 22H2 is where the product stopped developing.

**What continued, until support ended:** monthly security and quality updates.
Those kept arriving on the usual schedule for the whole supported period.

**What never changed:** activation, your files, your applications. Nothing expired
or switched off at any point.

The practical effect while it was supported was simply that the operating system
stopped changing. For a lot of people — and for a lot of businesses running
line-of-business software — that stability was the appeal rather than a problem.

## Why being on 22H2 mattered

Only the final version received updates. Machines left on an older Windows 10
version stopped being serviced well before the overall end-of-support date, which
caught out anyone who assumed "Windows 10 is supported until 2025" applied to
whichever version they happened to be running.

If you are auditing machines now, the version matters as much as the product:

- **Version 22H2** — was serviced through to the end-of-support date.
- **Any earlier Windows 10 version** — stopped receiving updates earlier, and has
  been accumulating unpatched vulnerabilities for longer.

## How to check where a machine stands

1. Press \`Win + R\`, type \`winver\`, and press Enter.
2. Read the **Version** line. It should say 22H2 for the final Windows 10 release.
3. Note the build number — 19045 is the 22H2 build family.
4. Check **Settings > Windows Update > Update history** to see when the machine
   last successfully installed anything.

A machine whose last successful update is months or years old is the one to deal
with first, regardless of what version it reports.

## Editions with different timelines

One caveat worth knowing before you audit a fleet: not every Windows 10 edition
followed the same schedule.

The **LTSC** (Long-Term Servicing Channel) editions, used for fixed-function
machines such as tills, medical devices and industrial controllers, have their own
much longer support lifecycles and are versioned separately. A machine reporting
an LTSC edition is not necessarily out of support just because mainstream Windows
10 is.

Check the **Edition** line in \`winver\` before assuming a device needs migrating —
Enterprise LTSC and IoT Enterprise LTSC are the ones to look out for.

## Conclusion

"Final version" meant Windows 10 stopped gaining features, not that it stopped
working. Version 22H2 was the last one, it was the only one still being serviced,
and getting a machine onto it was the prerequisite for receiving any further
security updates at all.

If you are still running Windows 10 today, the version question is now settled and
the live question is what to do about support having ended entirely.

**Next step:** run \`winver\` on each machine you are responsible for and write down
the version and build. That inventory is what any migration decision has to start
from.`,
    faq: [
      {
        question: 'Will my PC stop working in October 2025?',
        answer:
          'No. It keeps running exactly as it does now. What stops is security updates, which means newly discovered vulnerabilities stay unpatched on that machine from then on.',
      },
      {
        question: 'How do I check whether my PC can run Windows 11?',
        answer:
          'Download the PC Health Check app from Microsoft and run it. It names the specific blocker rather than just failing, which is what you need to know.',
      },
      {
        question: 'Is Extended Security Updates worth it?',
        answer:
          'It depends on how long you need the machine. ESU buys time on hardware that cannot take Windows 11 and cannot be replaced yet. It is not a long-term plan — the cost is annual and the end date is fixed.',
      },
    ],
    sources: [MS_LIFECYCLE],
  },

  /* --------------------------------------------------- update problems */
  {
    slug: 'windows-update-stuck-how-to-unstick',
    title: 'Windows Update stuck at 0% or 100%: how to unstick it',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 4,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Windows Update stuck: how to unstick it',
    metaDescription:
      'An update sitting at 0%, 100% or a fixed percentage is usually still working. How long to wait, and what to do when it genuinely is stuck.',
    quickAnswer:
      'Most updates that look stuck are still working — the percentage indicator is a rough estimate, not a live progress bar. Wait two hours before intervening. If nothing has changed after that, clear the update cache and retry.',
    body: `An update that has not moved in twenty minutes is almost certainly still
running. The percentage shown during a Windows update is an estimate, and the long
pauses at 0, 30, 61 and 100 percent are normal points where a lot of work happens
without the number changing.

**Wait two hours before doing anything.** That is the honest first step, and it
resolves more of these than any command does. On a mechanical hard drive, four
hours is not unreasonable.

While you wait, check whether the machine is actually working:

- **Disk activity light** flickering means it is doing something.
- **Ctrl + Alt + Del** — if the screen responds, Windows is alive.
- Watch **network activity**: still downloading means still progressing.

## Method 1: Restart and let it resume

If two hours have passed with no disk activity at all, restart.

1. Hold the power button until the machine turns off.
2. Wait ten seconds, then power on.
3. Windows will either resume the update or roll it back. Both are fine — let it
   finish either way, and do not interrupt this part.

Rolling back can itself take a while. Leave it.

## Method 2: Clear the update cache

Once you are back at the desktop:

1. Open an **elevated** Command Prompt.
2. Run:

\`\`\`
net stop wuauserv
net stop bits
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
net start wuauserv
net start bits
\`\`\`

3. Reboot and check for updates again.

## Method 3: Free up disk space

Updates stall when they run out of room mid-install.

1. Open **Settings > System > Storage**.
2. Run **Cleanup recommendations** and clear temporary files.
3. Aim for at least 20 GB free before retrying a feature update.

## Method 4: Start in Safe Mode and retry

Safe Mode loads a minimal driver set, which rules out third-party software
interfering.

1. **Settings > System > Recovery > Advanced startup > Restart now**.
2. Choose **Troubleshoot > Advanced options > Startup Settings > Restart**.
3. Press **5** for Safe Mode with Networking.
4. Run the update from there, then reboot normally.

## If nothing worked

An update that repeatedly stalls at the same percentage is usually blocked by one
specific thing rather than being generally broken. The two most common are a
third-party antivirus holding servicing paths open, and a failing disk. Uninstall
the antivirus temporarily — disabling it is often not enough — and run
\`chkdsk C: /scan\` to rule out the drive.

**Never turn off a machine that is showing "Working on updates — don't turn off
your computer" unless it has been genuinely idle for hours.** Interrupting a
servicing operation partway through is how a slow update becomes an unbootable
machine.

## How long is too long?

The hardest part of a stuck update is knowing when it is stuck rather than slow.
There is no exact figure, but these are reasonable thresholds before intervening:

- **Downloading, no progress for an hour** — likely stuck. Safe to intervene; a
  download is not a servicing operation.
- **"Installing", percentage moving at all** — leave it, however slowly it moves.
- **"Working on updates" at the same percentage for 3+ hours** — probably stuck,
  but check for disk activity before doing anything.
- **On a mechanical hard drive** — double every figure above. Feature updates on
  spinning disks genuinely take hours.

Before concluding it is frozen, look for signs of life: the drive activity light,
or the disk figure in Task Manager if you can still reach it. A machine quietly
working at 100% disk is making progress even when the screen has not changed.

## Confirming it recovered properly

Once you are back at a desktop, do not assume the update landed:

1. Check **Settings > Windows Update > Update history** for the entry and its
   status.
2. Run \`winver\` and compare the revision with what it was before.
3. Check for updates again to see whether it is being re-offered.
4. Restart once more and confirm the machine boots normally.

## Conclusion

Most updates that look frozen are simply slow, and the single most damaging thing
you can do is power the machine off during a servicing operation. Give it real
time, look for disk activity rather than screen changes, and only intervene once
the evidence says nothing is happening.

When you do intervene, work from least to most disruptive: wait, then reboot, then
clear the cache, then repair the component store.

**Next step:** check Task Manager or the drive activity light before touching the
power button. That one observation is the difference between a slow update and a
broken installation.`,
    faq: [
      {
        question: 'How long is too long?',
        answer:
          'Two hours with no disk activity at all. Two hours with the disk light flickering means it is still working — leave it. On a mechanical drive, a feature update taking four hours is normal.',
      },
      {
        question: 'Is it safe to force a shutdown during an update?',
        answer:
          'It carries real risk of leaving Windows unbootable, which is why it is the last resort here and not the first. Only do it once you are confident nothing has happened for hours.',
      },
      {
        question: 'Why does it always pause at the same percentage?',
        answer:
          'The percentages map to phases, not to elapsed work. The long pauses fall where Windows is moving or replacing large numbers of files, which takes time without changing the number on screen.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'windows-update-keeps-reinstalling-same-update',
    title: 'Windows Update keeps reinstalling the same update',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 8,
    testedOnBuild: '22631.4460',
    qualityScore: 85,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Windows Update keeps installing the same update',
    metaDescription:
      'An update that installs, asks for a restart, then offers itself again has usually failed silently. How to find out why and stop the loop.',
    quickAnswer:
      'An update that keeps reappearing has not actually finished installing — it fails during the restart phase and rolls back, then gets offered again. Check the update history for the real error code, then clear the cache and install it manually.',
    body: `When the same update is offered over and over, Windows is not being
forgetful. The update is failing during the part of the install that happens
during restart, rolling back, and being offered again at the next check.

The first job is finding out why, and the update history has that.

## Method 1: Find the real error

1. Open **Settings > Windows Update > Update history**.
2. Find the update. It will say **Failed to install** with an error code, even
   though the desktop showed no failure.
3. Note the code — that is the actual problem, and it has its own fix.

Common ones: **0x800f0922** (reserved partition full), **0x80073712** (component
store damage), **0x80070002** (missing files).

If the history shows the update as **Successfully installed** but it is still
being offered, skip to Method 3.

## Method 2: Clear the cache and let it re-download

A corrupt cached package will fail the same way every time.

\`\`\`
net stop wuauserv
net stop bits
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
net start wuauserv
net start bits
\`\`\`

Reboot and check for updates. Windows re-downloads the package from scratch.

## Method 3: Install it manually

This bypasses Windows Update and usually breaks the loop.

1. Note the KB number from the update history.
2. Search for it at the Microsoft Update Catalog.
3. Download the \`.msu\` for x64 and run it.
4. Restart when it asks.

A manual install reports its own errors directly, which is more useful than the
generic message Windows Update shows.

## Method 4: Repair the servicing stack

> **Needs an internet connection and takes a while.**

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
\`\`\`

Reboot and retry.

## If nothing worked

If the update genuinely installs successfully and is still offered again, the
Windows Update database is out of step with what is on disk. Resetting it — Method
2 — is the fix, and it needs the \`catroot2\` folder renamed as well:

\`\`\`
net stop cryptSvc
ren C:\\Windows\\System32\\catroot2 catroot2.old
net start cryptSvc
\`\`\`

On a managed device, check whether a policy is reapplying the update. A WSUS or
Intune configuration that keeps re-offering something already installed is a
server-side problem, not a client one.

## First, work out which of two things is happening

These look identical in **Update history** and have completely different causes.
Establish which one you have before changing anything.

**It is failing and retrying.** The update never actually installs. History shows
repeated failed entries, usually with an error code beside them.

**It is installing and being offered again.** History shows repeated *successful*
entries for the same KB. The update applied; Windows just does not believe it did.

To tell them apart:

1. Open **Settings > Windows Update > Update history**.
2. Find every entry for that KB number and read the status on each.
3. Run \`winver\` and note the build revision.
4. Compare that revision against the one the update is supposed to deliver.

If the revision matches what the update installs, it applied and the detection
database is stale — that is the second case, and Method 2 is the fix. If the
revision never moves, it is genuinely failing, and the error code beside the entry
is what you should be troubleshooting.

## When it is a superseded update

There is a third, less obvious case. Windows sometimes re-offers an update that
has been replaced by a newer one, particularly on machines that have been offline
for a while or that had updates paused.

The giveaway is that the offered KB is **older** than something already installed.
Installing the current cumulative update usually clears it, because the newer
package supersedes the old one and detection stops matching.

## How to confirm you have fixed it

The loop is only broken once the update stops being offered, so confirmation takes
a little patience:

1. After applying the fix, reboot.
2. Check for updates. The KB should not reappear.
3. Check again a day later — detection runs on a schedule, and one clean check is
   not conclusive.
4. Confirm **Update history** has no new entry for that KB.

## How to stop it recurring

- **Do not pause updates for long stretches.** Long pauses are the most common way
  a machine ends up being offered superseded packages.
- **Let a reboot complete when asked.** An update that is staged but never
  finalised will be offered again indefinitely.
- **Keep the clock on automatic.** Detection compares timestamps, and a drifting
  clock confuses it.
- **Do not clear \`SoftwareDistribution\` routinely.** Emptying it deletes the
  detection database, and Windows then has to rediscover what is installed —
  which is exactly the state that causes re-offers.

## Conclusion

An update that keeps coming back is either failing quietly or succeeding without
being recorded, and the two need opposite responses. Reading update history
alongside the build revision in \`winver\` tells you which within a minute, and
saves running repairs that were never going to help. Resetting the update
database, including \`catroot2\`, resolves the stale-detection case in almost every
instance.

**Next step:** compare your \`winver\` revision against what the update should
install. That one comparison decides which half of this guide applies to you.`,
    faq: [
      {
        question: 'Why does the desktop not tell me it failed?',
        answer:
          'The failure happens during the restart phase, before the desktop loads. By the time you sign in, the rollback has already completed and Windows shows a normal desktop. Only the update history records what happened.',
      },
      {
        question: 'Can I just hide the update?',
        answer:
          'Microsoft withdrew the official Show/Hide Updates tool. You can pause updates for up to five weeks, but that stops all of them, not just the failing one — and it does not fix the underlying problem.',
      },
      {
        question: 'Is the loop harmful?',
        answer:
          'Not directly, but each attempt means a restart cycle and a rollback, and the machine is not receiving the security fixes in that update the whole time it keeps failing.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_ERROR_REFERENCE],
  },

  {
    slug: 'recover-from-update-reboot-loop',
    title: 'How to recover from a reboot loop after a Windows update',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 14,
    testedOnBuild: '22631.4460',
    qualityScore: 88,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Recover from a reboot loop after a Windows update',
    metaDescription:
      'A PC that restarts before reaching the desktop after an update can be recovered from the Recovery Environment. How to get in and what to do there.',
    quickAnswer:
      'Force the Recovery Environment by interrupting boot three times, then use Startup Repair. If that does not work, uninstall the most recent quality update from Advanced options — that reverses the change without touching your files.',
    body: `A machine that reboots before reaching the desktop after an update is
recoverable in almost every case, and the tools to do it are already on the disk.
You do not need installation media for the first two methods.

Work through these in order. They get progressively more invasive.

## Getting into the Recovery Environment

Windows enters recovery automatically after a few failed boots, but you can force
it:

1. Power on the machine.
2. As soon as you see the Windows logo, hold the power button until it turns off.
3. Repeat twice more.
4. On the fourth start, Windows shows **Automatic Repair** and then
   **Advanced options**.

This is the intended way in, not a trick — Windows counts failed boots for exactly
this purpose.

## Method 1: Startup Repair

The least invasive option, and it fixes a reasonable share of boot problems on its
own.

1. **Troubleshoot > Advanced options > Startup Repair**.
2. Pick your account and enter the password if asked.
3. Let it run. It can take 20 minutes and may restart on its own.

If it reports that it could not repair the PC, move on — that message is common
and does not mean the machine is beyond recovery.

## Method 2: Uninstall the most recent update

This directly reverses the change that broke the boot.

1. **Troubleshoot > Advanced options > Uninstall Updates**.
2. Choose **Uninstall latest quality update**.
3. Let it finish and restart.

If the machine boots, pause updates from **Settings > Windows Update** for a week
so you are not immediately offered the same thing again.

If a quality update was not the cause, repeat and choose **Uninstall latest
feature update** instead.

## Method 3: System Restore

> **This rolls back system settings, drivers and registry state to a previous
> point.** Personal files are not affected, but applications installed since the
> restore point will need reinstalling.

1. **Troubleshoot > Advanced options > System Restore**.
2. Pick a restore point dated before the update.
3. Follow the prompts and let it complete without interrupting.

If no restore points exist, System Restore was turned off on this machine and this
method is unavailable.

## Method 4: Boot into Safe Mode and investigate

1. **Troubleshoot > Advanced options > Startup Settings > Restart**.
2. Press **4** for Safe Mode, or **5** for Safe Mode with Networking.

If Safe Mode works, the problem is a driver or a service rather than Windows
itself. Roll back recently updated drivers in **Device Manager** — graphics and
storage drivers are the usual culprits.

## If nothing worked

At this point the options narrow to reinstalling. **Reset this PC** from
**Troubleshoot > Reset this PC** offers a **Keep my files** option that reinstalls
Windows while preserving personal files — applications go, files stay.

Before doing that, get your data off the machine. From the Recovery Environment,
**Troubleshoot > Advanced options > Command Prompt** gives you a shell. Drive
letters differ in recovery, so use \`diskpart\` and \`list volume\` to find the right
one, then copy what matters to a USB drive. Do that first, every time.`,
    faq: [
      {
        question: 'Will uninstalling the update lose my files?',
        answer:
          'No. Uninstalling a quality or feature update from the Recovery Environment reverses the update only. Personal files are untouched.',
      },
      {
        question: 'How many times do I need to interrupt the boot?',
        answer:
          'Three. On the fourth start Windows enters recovery on its own. Interrupt at the Windows logo — before that and it does not count as a failed boot.',
      },
      {
        question: 'Can I get my files off if Windows will not start at all?',
        answer:
          'Yes. The Recovery Environment includes a Command Prompt. Use diskpart and list volume to find your Windows drive — the letters are different in recovery — then copy files to a USB drive with xcopy.',
      },
      {
        question: 'What if the Recovery Environment will not open either?',
        answer:
          'Create Windows installation media on another PC with the Media Creation Tool, boot from it, and choose Repair your computer. That gives you the same tools from external media.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT],
  },

  /* --------------------------------------------------- app not working */
  {
    slug: 'outlook-not-opening-after-windows-update',
    title: 'Outlook not opening after a Windows update',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 7,
    testedOnBuild: '26100.2314',
    qualityScore: 89,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Outlook not opening after a Windows update',
    metaDescription:
      'Outlook failing to start after a Windows update is usually an add-in or a damaged profile. Start it in safe mode to find out which, then fix that.',
    quickAnswer:
      'Start Outlook in safe mode with outlook.exe /safe. If it opens, an add-in is the problem — disable them and re-enable one at a time. If it does not, the profile or the Office installation needs repairing.',
    body: `Outlook refusing to start after a Windows update is nearly always one of
three things: an add-in that no longer loads, a damaged profile, or an Office
installation that needs repairing. Safe mode tells you which in about thirty
seconds, so start there rather than guessing.

## Step 1: Find out whether it is an add-in

1. Press \`Win + R\`.
2. Type \`outlook.exe /safe\` and press Enter.
3. Choose your profile if prompted.

**If Outlook opens in safe mode**, an add-in is at fault — go to Method 1.
**If it still fails**, the profile or installation is damaged — skip to Method 2.

## Method 1: Disable add-ins

1. In safe mode, open **File > Options > Add-ins**.
2. At the bottom, set **Manage** to **COM Add-ins** and click **Go**.
3. Untick everything and click **OK**.
4. Close Outlook and start it normally.

If it opens, re-enable the add-ins **one at a time**, restarting Outlook after
each. The one that brings the failure back is your answer — leave it off and check
the vendor for an update.

Conferencing and CRM plug-ins are the usual offenders after a Windows update.

## Method 2: Create a fresh profile

> **This does not delete mail.** A new profile re-downloads from the server. Only
> locally-stored items in a \`.pst\` file need attention, and those can be
> reattached afterwards.

1. Close Outlook.
2. Open **Control Panel** and search for **Mail**, then open **Mail (Microsoft
   Outlook)**.
3. Click **Show Profiles**, then **Add**.
4. Name the new profile, and let it configure your account.
5. Select **Always use this profile** and pick the new one.
6. Start Outlook.

If the new profile works, the old one was damaged. Keep it around until you are
sure nothing local is missing.

## Method 3: Repair Office

1. Open **Settings > Apps > Installed apps**.
2. Find your Microsoft 365 or Office entry, click the **…** menu, then **Modify**.
3. Choose **Quick Repair** first — it works offline and takes a few minutes.
4. If that does not fix it, repeat and choose **Online Repair**.

Online Repair effectively reinstalls Office. Set aside half an hour and expect to
sign in again afterwards.

## Method 4: Check the navigation pane

A corrupt navigation pane file causes Outlook to hang at startup with no error.

1. Press \`Win + R\`.
2. Type \`outlook.exe /resetnavpane\` and press Enter.

This rebuilds the folder pane and loses nothing but the customised layout.

## If nothing worked

Check whether Outlook is running invisibly: open **Task Manager**, look under
**Details** for \`OUTLOOK.EXE\`, and end it if present, then try again. A stale
process blocks a new instance from starting and shows no error at all.

If Outlook is a work account, the problem may be server-side rather than on this
machine. Try the same account in a browser at outlook.office.com — if that fails
too, it is not your PC.`,
    faq: [
      {
        question: 'Will creating a new profile delete my email?',
        answer:
          'No. Mail on an Exchange or Microsoft 365 account lives on the server and re-downloads into the new profile. Only items stored locally in a .pst file are profile-specific, and you can attach that file to the new profile.',
      },
      {
        question: 'How do I know which add-in is the problem?',
        answer:
          'Disable all of them, confirm Outlook starts, then re-enable one at a time with a restart after each. It is slow but it is the only reliable way to identify the culprit.',
      },
      {
        question: 'What is the difference between Quick Repair and Online Repair?',
        answer:
          'Quick Repair works offline and fixes damaged files from a local cache in a few minutes. Online Repair downloads and effectively reinstalls Office — it fixes more, takes much longer, and needs a connection.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'printer-not-working-after-windows-update',
    title: 'Printer stopped working after a Windows update',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 11,
    testedOnBuild: '26100.2314',
    qualityScore: 86,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Printer not working after a Windows update',
    metaDescription:
      'A printer that stops after a Windows update is usually a driver or a stuck print spooler. Clear the spooler queue first, then reinstall the driver.',
    quickAnswer:
      'Restart the Print Spooler service and clear its queue — that fixes most cases. If the printer still does not respond, remove it and reinstall it so Windows fetches a current driver.',
    body: `Printing breaking after a Windows update comes down to two things: the
print spooler got stuck, or the driver is no longer compatible. The spooler is
quicker to check, so start there.

## Method 1: Restart the print spooler

1. Press \`Win + R\`, type \`services.msc\`, and press Enter.
2. Find **Print Spooler** in the list.
3. Right-click it and choose **Restart**.
4. Try printing.

If a document was stuck in the queue, this usually releases it.

## Method 2: Clear the print queue by hand

A job that cannot be cancelled from the queue window needs the files removing
directly.

1. Open an **elevated** Command Prompt.
2. Stop the spooler:

\`\`\`
net stop spooler
\`\`\`

3. Delete the queued files:

\`\`\`
del /Q /F /S "%systemroot%\\System32\\spool\\PRINTERS\\*"
\`\`\`

4. Start it again:

\`\`\`
net start spooler
\`\`\`

5. Try printing.

This deletes pending print jobs — you will need to send them again.

## Method 3: Run the printer troubleshooter

1. Open **Settings > System > Troubleshoot > Other troubleshooters**.
2. Click **Run** next to **Printer**.
3. Choose the affected printer and apply what it suggests.

## Method 4: Remove and reinstall the printer

This makes Windows fetch a current driver rather than reusing the one that broke.

1. Open **Settings > Bluetooth & devices > Printers & scanners**.
2. Select the printer and click **Remove**.
3. Click **Add device** and let Windows find it again.
4. If it is not detected, choose **Add manually** and follow the prompts.

For network printers you may need the IP address. It is usually printable from the
printer's own control panel.

## Method 5: Install the manufacturer's driver

Windows Update carries generic drivers that cover basic printing. For anything
beyond that — duplex, trays, scanning on an all-in-one — the manufacturer's driver
is usually needed, and it is often newer than what Windows ships.

Download it from the manufacturer's support site for your exact model and your
Windows version, then install it directly.

## If nothing worked

Check that the printer is genuinely reachable rather than assuming the PC is at
fault. Print a test page from the printer's own control panel: if that fails, the
problem is the printer, not Windows.

For a network printer, \`ping\` its IP address from a Command Prompt. No reply means
a network problem — the printer may have taken a different address after a
restart. Assigning it a static address, or a DHCP reservation on the router, stops
that recurring.

## Why updates break printing so reliably

Printing is disproportionately affected by Windows updates, and the reason is
structural rather than bad luck.

Printer drivers run close to the operating system and have historically been a
security weak point, so Microsoft has repeatedly tightened how they are installed
and how they communicate. Each tightening is a security improvement that also
breaks drivers written against the older, looser behaviour.

The practical consequences:

- **Manufacturer drivers age badly.** A driver written for an older Windows
  version may keep working for years and then stop at a single update.
- **Network printing is affected more than USB**, because more of the hardening
  has been about how print jobs travel over a network.
- **Shared printers on a home network** are a frequent casualty, since the client
  and the machine sharing the printer must both be happy with the new rules.

This is why the modern advice is to prefer the driver Windows supplies, or the
manufacturer's current one, over whatever was installed when the printer was new.

## How to confirm printing is genuinely fixed

Do not stop at one successful page.

1. Print a test page from **Settings > Bluetooth & devices > Printers & scanners**,
   select the printer, then **Printer properties > Print Test Page**.
2. Print from the application you actually use. Some problems only appear from
   specific programs.
3. If it is a network printer, restart the PC and print again — this catches
   problems that only appear after the printer is rediscovered.
4. Check the print queue is empty afterwards rather than holding a stuck job.

## Reducing the chance of it happening again

- **Keep the printer's firmware current.** Manufacturers ship fixes for exactly
  these compatibility changes, and firmware is easy to forget.
- **Use a DHCP reservation** for network printers so the address never moves.
- **Prefer the current manufacturer driver** over an old bundled one, and prefer
  the Windows-supplied driver over an unmaintained manufacturer package.
- **Do not install "driver updater" utilities.** They routinely install the wrong
  driver and make this class of problem harder to diagnose.

## Conclusion

Printing that stops after an update is usually a driver that no longer meets
tightened requirements, or a printer that has quietly changed address — not a
broken printer. Clearing the queue and restarting the spooler resolves the
transient cases, and reinstalling with a current driver resolves most of the rest.

**Next step:** print a test page from the printer's own control panel first. If
that works, the printer is fine and the problem is on the PC, which halves what
you need to investigate.`,
    faq: [
      {
        question: 'Why does the spooler get stuck after an update?',
        answer:
          'Servicing restarts the spooler service. A job that was partway through when that happened can be left in a state the spooler will not process, and it blocks everything behind it in the queue.',
      },
      {
        question: 'Should I use the Windows driver or the manufacturer one?',
        answer:
          "Windows' generic driver is fine for plain printing and needs no maintenance. Use the manufacturer's if you need duplex, tray selection, scanning or colour management.",
      },
      {
        question: 'The printer works from my phone but not my PC.',
        answer:
          'That confirms the printer and the network are fine, and narrows it to the PC. Removing and re-adding the printer is the right next step.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT],
  },

  /* ---------------------------------------------------------- how-to */
  {
    slug: 'how-to-pause-windows-updates',
    title: 'How to pause Windows updates in Windows 11',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 10,
    testedOnBuild: '26100.2314',
    qualityScore: 92,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'How to pause Windows updates in Windows 11',
    metaDescription:
      'Pause Windows 11 updates for up to five weeks from Settings, set active hours so restarts do not interrupt you, or defer them with Group Policy on Pro.',
    quickAnswer:
      'Open Settings > Windows Update and choose a duration from the Pause updates dropdown — up to five weeks. After that Windows must install pending updates before you can pause again.',
    body: `Windows 11 lets you postpone updates without turning them off. That
distinction matters: pausing is supported and reversible, and Windows resumes on
its own afterwards. Disabling updates permanently is not, and leaves the machine
unpatched.

## Method 1: Pause from Settings

The normal way, and the one to use.

1. Open **Settings** with \`Win + I\`.
2. Go to **Windows Update**.
3. Find **Pause updates** at the top.
4. Choose a duration from the dropdown — **1 week** through **5 weeks**.

The page then shows the date updates resume. To resume early, click **Resume
updates**.

Once the pause expires, Windows installs what is pending before you can pause
again. That is deliberate — it stops indefinite pausing.

## Method 2: Set active hours

This does not stop updates; it stops them restarting your machine while you are
using it. For most people this is the setting they actually wanted.

1. Open **Settings > Windows Update > Advanced options**.
2. Click **Active hours**.
3. Set **Adjust active hours** to **Manually**.
4. Choose a start and end time covering when you use the PC.

Windows will not restart during those hours. Leaving it on **Automatically** lets
Windows learn from your usage, which works well on a machine used at consistent
times.

## Method 3: Defer feature updates (Windows 11 Pro)

Pro adds a policy that holds back annual feature updates while still taking
monthly security fixes. This is the right tool if you want to skip 24H2 for now
but stay patched.

1. Press \`Win + R\`, type \`gpedit.msc\`, and press Enter.
2. Navigate to **Computer Configuration > Administrative Templates > Windows
   Components > Windows Update > Manage updates offered from Windows Update**.
3. Open **Select the target Feature Update version**.
4. Set it to **Enabled** and enter the version you want to stay on, such as
   \`23H2\`.

\`gpedit.msc\` is not present on Windows 11 Home.

## Method 4: Set a metered connection

Windows limits what it downloads automatically over a connection marked as
metered. This is a blunt instrument — it affects other apps too — but it works on
Home.

1. Open **Settings > Network & internet**.
2. Select your Wi-Fi or Ethernet connection.
3. Turn on **Metered connection**.

Security updates may still download. This slows updates down; it does not stop
them.

## If nothing worked

If updates install despite a pause, the device is probably managed by an
organisation, and its policy overrides local settings. **Settings > Windows
Update** shows a note saying some settings are managed when that is the case.

Resist the advice you will find elsewhere to disable the Windows Update service
outright. It breaks the Microsoft Store and Defender definition updates along with
everything else, and it leaves the machine accumulating unpatched
vulnerabilities.`,
    faq: [
      {
        question: 'What is the longest I can pause updates?',
        answer:
          'Five weeks from Settings. After that Windows installs what is pending before allowing another pause.',
      },
      {
        question: 'Does pausing stop security updates too?',
        answer:
          'Yes — pausing holds everything, including security fixes. That is why it is capped at five weeks. If you only want to avoid feature updates, use Method 3 on Pro instead.',
      },
      {
        question: 'Can I stop updates permanently?',
        answer:
          'There is no supported way, and the unsupported ones break Microsoft Store and Defender updates as collateral damage. Pausing and active hours cover the legitimate reasons for wanting this.',
      },
      {
        question: 'Will pausing stop the restart prompts?',
        answer:
          'It stops new updates arriving, so eventually yes. For prompts about updates already downloaded, set active hours — that stops the restart happening while you are working.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'how-to-uninstall-a-windows-update',
    title: 'How to uninstall a Windows update',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 13,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'How to uninstall a Windows update',
    metaDescription:
      'Remove a Windows update from Settings, from the command line with wusa, or from the Recovery Environment when the PC will not start.',
    quickAnswer:
      'Open Settings > Windows Update > Update history > Uninstall updates, find the update by its KB number, and select Uninstall. Pause updates afterwards or Windows will offer the same one again.',
    body: `Most Windows updates can be removed after installation. Quality updates —
the monthly cumulative ones — uninstall cleanly. Feature updates can be reversed
within ten days. Servicing stack updates cannot be removed at all, by design.

Find the KB number first: **Settings > Windows Update > Update history**.

## Method 1: Uninstall from Settings

1. Open **Settings > Windows Update**.
2. Click **Update history**.
3. Scroll down and click **Uninstall updates**.
4. Find the update by its KB number.
5. Click **Uninstall** and confirm.
6. Restart when prompted.

Only recent, removable updates appear in this list. If the update you want is not
there, it is a servicing stack update and cannot be removed.

## Method 2: Uninstall from the command line

Useful when Settings will not open, or for scripting across several machines.

1. Open an **elevated** Command Prompt.
2. List what is installed:

\`\`\`
wmic qfe list brief /format:table
\`\`\`

3. Remove one by KB number, without the letters:

\`\`\`
wusa /uninstall /kb:5044284
\`\`\`

4. Add \`/quiet /norestart\` to suppress prompts if you are scripting it.

## Method 3: Roll back a feature update

> **You have ten days.** After that the previous installation is deleted and this
> option disappears.

1. Open **Settings > System > Recovery**.
2. Next to **Go back**, click **Go back**.
3. Choose a reason and follow the prompts.
4. The machine restarts several times.

Running Disk Cleanup and removing previous Windows installations ends this window
immediately, even inside the ten days.

## Method 4: Uninstall when Windows will not start

1. Interrupt the boot three times to force the Recovery Environment.
2. Choose **Troubleshoot > Advanced options > Uninstall Updates**.
3. Pick **Uninstall latest quality update** or **Uninstall latest feature
   update**.
4. Let it finish and restart.

## Stopping it coming back

Windows offers the update again at the next check. To get some breathing room:

1. Open **Settings > Windows Update**.
2. Set **Pause updates** to a week or more.

That gives you time to work out what broke without the same update reinstalling
itself overnight.

## If nothing worked

If the uninstall fails or the update does not appear anywhere, it is likely a
servicing stack update, which is permanent. Those are small, they only change the
update mechanism itself, and they are very rarely the cause of a problem — look
elsewhere.

Where the machine is unusable and rollback is not available, **System Restore**
from the Recovery Environment can reach further back, provided restore points
exist.

Removing an update means going without whatever security fixes it carried. Treat
it as a way to buy time while the real problem is identified, not as a
resolution.

## What you cannot uninstall

Not everything in update history can be removed, and knowing which is which saves
a lot of hunting through the list.

- **Servicing stack updates (SSUs)** cannot be uninstalled. They update the
  component that installs updates, and removing one could leave the machine unable
  to service itself at all. Recent cumulative updates bundle the SSU, which is why
  some entries have no Uninstall option.
- **Feature updates** are not uninstalled — they are rolled back through
  **Settings > System > Recovery > Go back**, and only within the rollback window.
- **Driver updates** are removed through Device Manager rather than update
  history, using **Roll Back Driver** on the device's Properties.

If an entry has no **Uninstall** option, one of the above is usually why.

## Stopping it reinstalling immediately

An uninstalled update is offered again at the next check, so pause updates as soon
as the removal completes:

1. Go to **Settings > Windows Update > Advanced options**.
2. Set **Pause updates** for as long as it allows.
3. Note the KB number so you can watch for a fixed release.

Do not leave updates paused indefinitely. You are trading a known problem for a
growing set of unpatched vulnerabilities, and the pause exists to buy time rather
than to be a setting you forget about.

## Conclusion

Uninstalling an update is straightforward, reversible and occasionally the right
call — but it is a temporary measure. The update will be re-offered, and the
security fixes it carried are absent until it goes back on.

Use it to confirm that a specific update caused a specific problem, then pause
briefly while you look for the real fix or a corrected release. If the machine
will not boot far enough to reach Settings, the recovery environment offers the
same operation.

**Next step:** note the KB number before you remove anything, so you can check
whether a fixed version has since shipped.`,
    faq: [
      {
        question: 'Why is the update not in the uninstall list?',
        answer:
          'Servicing stack updates cannot be removed — they change the update mechanism itself and Windows deliberately makes them permanent. Feature updates are also not in that list; use Go back under Recovery instead.',
      },
      {
        question: 'How long can I roll back a feature update?',
        answer:
          'Ten days. Running Disk Cleanup and removing previous Windows installations ends the window early, even within those ten days.',
      },
      {
        question: 'Will uninstalling an update delete my files?',
        answer:
          'No. Uninstalling an update or rolling back a feature update leaves personal files alone. Applications installed after a feature update may need reinstalling once you roll back.',
      },
      {
        question: 'Can I reinstall the update later?',
        answer:
          'Yes. Windows offers it again at the next check unless you pause updates. You can also install it by hand from the Microsoft Update Catalog once whatever it broke has been dealt with.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT],
  },

  /* ------------------------------------------- error codes, second batch */
  {
    slug: 'fix-0x80070643-recovery-environment-update',
    title: 'How to fix 0x80070643 on a Windows recovery environment update',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 15,
    testedOnBuild: '22631.4460',
    qualityScore: 91,
    affectedBuilds: ['22631', '19045'],
    metaTitle: 'Fix error 0x80070643 (recovery environment update)',
    metaDescription:
      'When 0x80070643 appears on a Windows recovery environment update, the recovery partition is too small. How to confirm it, and how to resize it safely.',
    quickAnswer:
      'On a recovery environment (WinRE) update, 0x80070643 means the recovery partition does not have the roughly 250 MB of free space the update needs — it is not a generic install failure. You either resize the recovery partition or skip the update; the error itself is harmless and nothing else on the machine is affected.',
    body: `**0x80070643** is officially "a fatal error occurred during installation", which
tells you nothing. Historically it turned up on .NET Framework updates. But when it
appears specifically on a **recovery environment (WinRE) update**, the cause is
narrow and well understood: the recovery partition is too small for the new WinRE
image, so servicing gives up.

This matters because the failure loops. The update is offered, fails, and is offered
again at the next check, so update history fills with red.

> **This error does not affect how your PC runs.** WinRE is only used when you boot
> into recovery. A failed WinRE update leaves the existing recovery image in place
> and working. You are fixing a nagging failure, not a broken system.

## Method 1: Confirm this is actually the partition size

Do not resize anything until you have confirmed the diagnosis.

1. Open an **elevated** Command Prompt.
2. Check that WinRE is present and enabled:

\`\`\`
reagentc /info
\`\`\`

3. Look at **Windows RE status**. If it says \`Enabled\`, note the
   **Windows RE location** — it names the partition holding the image.
4. Now check the free space on that partition:

\`\`\`
diskpart
list disk
select disk 0
list partition
\`\`\`

5. Find the **Recovery** partition and note its size.

A recovery partition of 500 MB or more with a small WinRE image is usually fine.
One at 300 MB or below, or one showing under 250 MB free, is the problem. Type
\`exit\` to leave diskpart.

## Method 2: Decide whether you need the update at all

This is a legitimate option, not a cop-out.

The WinRE update hardens the recovery image. If the device is a personal machine
that is not encrypted with BitLocker and not managed by an employer, leaving the
update uninstalled is a reasonable choice — the failure is cosmetic.

To stop it being offered repeatedly, hide it with the Microsoft **Show or hide
updates** approach, or simply ignore the entry in update history.

If the device **is** BitLocker-encrypted or managed, do not skip it. Continue to
Method 3, or hand the machine to whoever administers it.

## Method 3: Resize the recovery partition

> **This is the destructive one. Back up before you start.** You will delete and
> recreate the recovery partition. If you mistype a partition number in diskpart
> you can destroy the wrong volume. If you are not comfortable in diskpart, stop
> here and use Method 2.

The sequence is: turn WinRE off, shrink the OS partition to free space, delete the
old recovery partition, create a new larger one, turn WinRE back on.

1. Open an **elevated** Command Prompt and disable WinRE:

\`\`\`
reagentc /disable
\`\`\`

2. Shrink the Windows partition to release 250 MB:

\`\`\`
diskpart
list disk
select disk 0
list partition
select partition 3
shrink desired=250 minimum=250
\`\`\`

   Replace \`3\` with the number of your **Windows** partition, not the recovery one.

3. Delete the existing recovery partition:

\`\`\`
list partition
select partition 4
delete partition override
\`\`\`

   Replace \`4\` with the number of the **Recovery** partition you identified in
   Method 1. Check it twice. \`override\` is required because Windows protects it.

4. Create the replacement. On a **GPT** disk:

\`\`\`
create partition primary id=de94bba4-06d1-4d40-a16a-bfd50179d6ac
gpt attributes=0x8000000000000001
\`\`\`

   On an **MBR** disk use \`create partition primary id=27\` instead.

5. Format it and leave diskpart:

\`\`\`
format quick fs=ntfs label="Windows RE tools"
exit
\`\`\`

6. Re-enable WinRE and confirm:

\`\`\`
reagentc /enable
reagentc /info
\`\`\`

7. **Windows RE status** should read \`Enabled\` again. Retry the update.

If \`reagentc /enable\` fails, the recovery image is not being found. Re-run
\`reagentc /info\` and check the location line before rebooting.

## If nothing worked

- **\`reagentc /enable\` reports an error.** Do not reboot repeatedly hoping it
  resolves. Run \`reagentc /info\` and confirm WinRE has a valid location. A machine
  with WinRE disabled still boots normally, so there is no emergency.
- **The disk has no shrinkable space.** A nearly-full drive cannot give up 250 MB
  contiguously. Free real space first, then retry the shrink.
- **The device is managed.** Domain-joined and Intune-managed devices often receive
  the WinRE update through a management channel with its own remediation. Repartitioning
  a managed device by hand can conflict with that. Escalate instead.`,
    faq: [
      {
        question: 'Is it safe to just ignore this error?',
        answer:
          'On an unencrypted personal machine, yes. The recovery environment keeps working with its existing image; only the update to that image fails. On a BitLocker-encrypted or employer-managed device, do not ignore it.',
      },
      {
        question: 'Why does 0x80070643 also show up on .NET updates?',
        answer:
          'Because it is a generic "fatal error during installation" code, not a specific one. The recovery-partition explanation applies only when the failing update is the recovery environment update. On a .NET update it means something else entirely.',
      },
      {
        question: 'Will resizing the partition delete my files?',
        answer:
          'The documented sequence does not touch personal files — it shrinks the Windows volume and recreates the recovery partition. But it is raw disk work in diskpart, where selecting the wrong partition number destroys data. Back up first.',
      },
      {
        question: 'How much space does the recovery partition need?',
        answer:
          'Roughly 250 MB of free space for the update to stage. Recovery partitions created by older installers were often sized just large enough for the original image and left no headroom.',
      },
    ],
    sources: [MS_WINRE, MS_ERROR_REFERENCE, MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'fix-0x800f081f-windows-11',
    title: 'How to fix 0x800f081f in Windows 11',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 17,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Fix error 0x800f081f in Windows 11',
    metaDescription:
      '0x800f081f means Windows could not find the source files it needs. How to point servicing at a known-good source, including for .NET Framework 3.5.',
    quickAnswer:
      '0x800f081f is CBS_E_SOURCE_MISSING — Windows needs replacement component files and cannot find them. Either the online source is blocked by policy, or the component store is damaged. Point DISM at a mounted Windows ISO with the /Source switch and the error usually clears.',
    body: `**0x800f081f** maps to \`CBS_E_SOURCE_MISSING\`. Windows servicing wanted files to
add or repair a component, looked in the places it knows about, and came up empty.

It shows up in three situations, and the fix differs for each:

- Installing an optional feature, most often **.NET Framework 3.5**
- Running \`DISM /RestoreHealth\` on a machine whose component store is damaged
- Applying a cumulative update on a device where Group Policy redirects servicing

Work out which one applies before choosing a method.

## Method 1: Repair from a mounted Windows ISO

The reliable fix is to give servicing a local source instead of making it fetch one.

1. Download the **Windows 11 Disk Image (ISO)** from Microsoft's official download
   page. The build should match or be newer than the one installed.
2. Double-click the ISO to mount it. Note the drive letter — this example uses \`E:\`.
3. Open an **elevated** Command Prompt and run:

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth /Source:esd:E:\\sources\\install.esd:1 /LimitAccess
\`\`\`

4. If the ISO contains \`install.wim\` rather than \`install.esd\`, use:

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth /Source:wim:E:\\sources\\install.wim:1 /LimitAccess
\`\`\`

5. When it completes, run:

\`\`\`
sfc /scannow
\`\`\`

6. Reboot and retry whatever failed.

\`/LimitAccess\` stops DISM falling back to Windows Update, which is the point — the
online source is what was failing.

## Method 2: Install .NET Framework 3.5 from the same source

If the error appeared while enabling .NET Framework 3.5 in **Turn Windows features
on or off**, install it directly from the ISO instead:

1. With the ISO still mounted, open an **elevated** Command Prompt.
2. Run:

\`\`\`
DISM /Online /Enable-Feature /FeatureName:NetFx3 /All /Source:E:\\sources\sxs /LimitAccess
\`\`\`

3. Adjust \`E:\` to your mounted drive letter.

The \`sources\sxs\` folder holds the side-by-side payload Windows removes from a
normal install to save space. This is exactly what it is for.

## Method 3: Check for a policy blocking the online source

On work machines, Group Policy frequently redirects component installation to a
network share that no longer exists.

1. Press \`Win + R\`, type \`gpedit.msc\`, and press Enter. (Not available on Home.)
2. Go to **Computer Configuration > Administrative Templates > System**.
3. Open **Specify settings for optional component installation and component repair**.
4. If it is **Enabled** with an alternate source path pointing at a dead share, that
   is your cause. Either correct the path or set the policy to **Not Configured**.
5. Tick **Contact Windows Update directly to download repair content** if you want
   servicing to use the online source.
6. Run \`gpupdate /force\`, then retry.

On a managed device, change this through whoever owns the policy rather than locally
— a local edit will be overwritten at the next refresh.

## If nothing worked

- **The ISO build is older than the installed build.** Servicing will not repair a
  newer system from older files. Download a current ISO.
- **The component store is damaged beyond repair.** Run
  \`DISM /Online /Cleanup-Image /ScanHealth\` and read the result. "The component store
  is repairable" means keep going; a store that reports unrepairable needs an in-place
  repair install from the same ISO, which keeps files and apps.
- **You are on Windows Home and the policy path does not apply.** Home has no
  \`gpedit.msc\`. Methods 1 and 2 still work and are the ones that matter.`,
    faq: [
      {
        question: 'What does 0x800f081f actually mean?',
        answer:
          'It is CBS_E_SOURCE_MISSING: the servicing stack needed source files for a component and could not locate them, either online or at any configured alternate path.',
      },
      {
        question: 'Do I need the exact same Windows version on the ISO?',
        answer:
          'It needs to match or be newer than what is installed. Repairing a newer build from an older ISO fails, usually with the same error.',
      },
      {
        question: 'Why does .NET Framework 3.5 need a source at all?',
        answer:
          'Its payload is not kept on disk after installation. Enabling the feature normally downloads it, so when the download path is blocked or redirected, the sources\\\\sxs folder on the ISO is the substitute.',
      },
      {
        question: 'Is /LimitAccess necessary?',
        answer:
          'It is what forces DISM to use only your local source instead of retrying Windows Update. Without it, DISM can fall back to the online source that was already failing and report the same error.',
      },
    ],
    sources: [MS_DISM, MS_ERROR_REFERENCE],
  },

  {
    slug: 'fix-0x8007000d-windows-update',
    title: 'How to fix 0x8007000d in Windows Update',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 19,
    testedOnBuild: '26100.2314',
    qualityScore: 89,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Fix error 0x8007000d in Windows Update',
    metaDescription:
      '0x8007000d means "the data is invalid" — the downloaded update files are corrupt. Clear the cache, repair the component store, or install the update by hand.',
    quickAnswer:
      '0x8007000d is ERROR_INVALID_DATA: the update package Windows downloaded is corrupt or incomplete. Clearing the update cache so Windows re-downloads it fixes most cases; if it recurs, the component store itself needs repairing.',
    body: `**0x8007000d** is the plain Win32 error \`ERROR_INVALID_DATA\`. Windows Update read
the package it downloaded, found it malformed, and stopped.

The good news is that the most common cause — a download interrupted or truncated —
is fixed by throwing the cache away. The less common cause is a damaged component
store, which takes longer but is still repairable.

## Method 1: Clear the update cache and re-download

> **This clears update history and cached downloads.** Nothing installed is removed.

1. Open an **elevated** Command Prompt.
2. Stop the services that hold the cache open:

\`\`\`
net stop wuauserv
net stop bits
\`\`\`

3. Rename the download folder so Windows rebuilds it:

\`\`\`
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
\`\`\`

4. Restart the services:

\`\`\`
net start wuauserv
net start bits
\`\`\`

5. Go to **Settings > Windows Update** and check for updates. The download starts
   from scratch.

If the update installs, delete \`C:\\Windows\\SoftwareDistribution.old\` afterwards to
reclaim the space.

## Method 2: Repair the component store

If the fresh download failed the same way, the problem is on the receiving end.

> **This takes 20 minutes or more and needs an internet connection.**

1. Open an **elevated** Command Prompt.
2. Run, in order, waiting for each to finish:

\`\`\`
DISM /Online /Cleanup-Image /ScanHealth
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
\`\`\`

3. Reboot and retry the update.

\`ScanHealth\` tells you whether the store is damaged before you spend time on the
repair. If it reports no component store corruption, skip straight to Method 3.

## Method 3: Install the update manually

When servicing keeps mangling the download, bypass it.

1. Find the KB number of the failing update in **Settings > Windows Update >
   Update history**.
2. Go to the **Microsoft Update Catalog** at \`catalog.update.microsoft.com\` and
   search for that KB number.
3. Match your architecture — **x64** for most PCs, **ARM64** for Snapdragon devices —
   and your Windows version.
4. Download the \`.msu\` and run it.
5. Reboot when prompted.

A manual install uses a different download path from Windows Update, so a corrupt
cache or a flaky Delivery Optimization peer cannot affect it.

## If nothing worked

- **Check the disk.** Repeated invalid-data errors on a machine that keeps
  re-downloading cleanly can indicate failing storage. Run \`chkdsk C: /scan\` and
  check drive health in **Settings > System > Storage**.
- **Turn off Delivery Optimization peer downloads.** Under **Settings > Windows
  Update > Advanced options > Delivery Optimization**, switch off **Allow downloads
  from other PCs** and retry. Peer-sourced fragments are a plausible source of
  corruption on a congested network.
- **Check available space.** A drive close to full can truncate a staged package.
  Free at least 20 GB before retrying a feature update.

## Telling it apart from codes that look similar

Update history often shows several failures at once, and the codes are easy to
blur together even though they point at different things:

- **0x8007000d** — the data was invalid. The file arrived and was malformed.
- **0x80070002** — the file was not found at all. A missing rather than corrupt
  file, usually a cache problem.
- **0x80073712** — a component store file is missing or damaged, which is a
  deeper problem than a bad download.

The distinction matters because it decides where to start. A corrupt download is
fixed by making Windows fetch it again; a damaged component store is not.

## How to confirm the fix worked

1. Open **Settings > Windows Update > Update history** and check the entry now
   reads **Successfully installed**.
2. Run \`winver\` and confirm the build revision — the digits after the dot —
   increased.
3. Check for updates once more. A stuck update often has others queued behind it.
4. If you renamed \`SoftwareDistribution\`, delete the \`.old\` folder afterwards to
   reclaim the space.

If history reports success but the revision has not moved, the update was recorded
rather than applied and will be offered again.

## Conclusion

0x8007000d means Windows read the update package it downloaded and found it
malformed. In most cases the cause is nothing more exotic than an interrupted or
truncated download, and clearing the cache so Windows fetches a clean copy is the
whole fix.

Escalate only if that fails: repair the component store, and if the same update
still refuses, install it by hand from the Microsoft Update Catalog to bypass the
download path entirely. Treat repeated invalid-data errors across several clean
downloads as a reason to check drive health rather than to keep retrying.

**Next step:** clear the update cache, retry, and check \`winver\` afterwards to
confirm the revision actually moved.`,
    faq: [
      {
        question: 'Does 0x8007000d mean my hard drive is failing?',
        answer:
          'Usually not — the overwhelming majority are a corrupt download that clears when the cache is emptied. Treat repeated failures across several fresh downloads as a reason to check drive health, not the first occurrence.',
      },
      {
        question: 'Is it safe to delete the SoftwareDistribution folder?',
        answer:
          'Renaming it is safe and is the documented approach. Windows recreates it on the next update check. You lose update history and cached downloads, nothing else.',
      },
      {
        question: 'Where do I find the KB number for a failed update?',
        answer:
          'Settings > Windows Update > Update history. Failed entries are listed alongside successful ones with their KB number and the error code.',
      },
      {
        question: 'Can I use the Update Catalog for feature updates too?',
        answer:
          'The catalog carries cumulative and standalone updates. Feature updates are better handled with the Installation Assistant or an ISO, which is a different process.',
      },
    ],
    sources: [MS_ERROR_REFERENCE, MS_UPDATE_TROUBLESHOOT, MS_DELIVERY_OPTIMIZATION],
  },

  {
    slug: 'fix-0xc1900101-feature-update-rollback',
    title: 'How to fix 0xC1900101 when a feature update rolls back',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 22,
    testedOnBuild: '26100.2314',
    qualityScore: 92,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Fix 0xC1900101 feature update rollback in Windows',
    metaDescription:
      '0xC1900101 is always a driver problem. How to find which driver rolled the upgrade back, and the order to fix it in.',
    quickAnswer:
      '0xC1900101 is a generic rollback code and it is always driver-related. Disconnect non-essential hardware, update or remove third-party storage and graphics drivers, uninstall third-party security software, then retry the feature update.',
    body: `A feature update reaches a high percentage, restarts, then reports "We couldn't
install Windows 11" and puts you back where you started with **0xC1900101** —
usually with a second extension code like \`-0x20017\` or \`-0x30018\`.

Microsoft's own guidance is unambiguous: 0xC1900101 is a **driver error**. The
extension tells you which phase it died in, but the cause is a driver the new build
could not carry over.

## Method 1: Strip the machine down and retry

The cheapest fix first, because it works surprisingly often.

1. Unplug every non-essential USB device — docks, external drives, printers,
   card readers, capture devices, gaming peripherals. Keep only keyboard and mouse.
2. Remove any secondary internal drives if that is practical.
3. Free up space. A feature update wants **at least 20 GB** on the system drive.
4. Retry from **Settings > Windows Update**.

Docking stations and external drives are consistently over-represented in these
failures because they inject storage and display drivers into the upgrade.

## Method 2: Deal with the third-party drivers that matter

Two driver classes cause most rollbacks: **storage controllers** and **graphics**.

1. Press \`Win + X\` and open **Device Manager**.
2. Expand **IDE ATA/ATAPI controllers** and **Storage controllers**. If a
   manufacturer's RAID or Intel RST driver is installed, note its version.
3. Get the current version from the **PC maker's** support site — not the chipset
   vendor's generic package — and install it.
4. Expand **Display adapters**. Install the latest driver from AMD, NVIDIA or Intel.
5. Retry the update.

If a driver has no update available and the device is not essential, disable it in
Device Manager for the duration of the upgrade and re-enable it afterwards.

## Method 3: Remove third-party security software

> **You are temporarily reducing protection.** Reconnect to the internet only long
> enough to run the update, and reinstall afterwards.

1. Uninstall third-party antivirus or endpoint protection through
   **Settings > Apps > Installed apps**.
2. Many vendors leave filter drivers behind. Run the vendor's official removal tool
   — most publish one — rather than trusting the uninstaller.
3. Reboot. Microsoft Defender re-enables itself automatically.
4. Retry the feature update.
5. Reinstall your security software once the upgrade completes.

## Method 4: Read the extension code

The digits after 0xC1900101 narrow it down.

- \`-0x20017\` — failed in the boot phase, before the new build started. Almost always
  a storage or boot-critical driver.
- \`-0x30018\` — failed during the first boot into the new build, typically a driver
  that hangs on load.
- \`-0x4000D\` — failed while migrating settings, often driver-related too.

In every case the action is the same: identify recently installed or manufacturer-specific
drivers and update or remove them. The extension tells you when it broke, not what to
type.

## If nothing worked

- **Use the Installation Assistant or an ISO.** An in-place upgrade started from
  mounted installation media takes a different path from Windows Update and can
  succeed where the servicing path fails. Choose **Keep personal files and apps**.
- **Check the setup logs.** \`C:\\$WINDOWS.~BT\\Sources\\Panther\\setuperr.log\` names the
  component that failed. It is dense, but searching the log for a driver filename is
  far faster than guessing.
- **Check for a safeguard hold.** If Microsoft has flagged a known incompatibility
  on your hardware, the update is being deliberately withheld and forcing it past
  the hold is how you end up with a broken machine. Waiting is the correct move.`,
    faq: [
      {
        question: 'Does 0xC1900101 mean my PC cannot run the new version?',
        answer:
          'No. It means a driver blocked the upgrade, not that the hardware is unsupported. Unsupported hardware produces a different, explicit compatibility message.',
      },
      {
        question: 'Which driver is usually responsible?',
        answer:
          'Storage controller drivers and graphics drivers, in that order. Manufacturer-specific RAID and Intel RST drivers are frequent culprits because the new build ships its own versions.',
      },
      {
        question: 'Is it safe to remove my antivirus temporarily?',
        answer:
          'Windows Defender takes over the moment a third-party product is removed, so the machine is not unprotected. Reinstall once the upgrade completes.',
      },
      {
        question: 'Did the rollback damage anything?',
        answer:
          'No. A rollback is the designed safety net — Windows restores the previous build with your files and applications intact. Repeated rollbacks are frustrating but not harmful.',
      },
      {
        question: 'Should I force past a safeguard hold?',
        answer:
          'No. A hold means Microsoft has confirmed a problem affecting your specific hardware or software combination. Bypassing it installs a build that is known to break on your device.',
      },
    ],
    sources: [MS_UPGRADE_ERRORS, MS_ERROR_REFERENCE, MS_SAFEGUARD],
  },

  /* -------------------------------------- windows updates, second batch */
  {
    slug: 'windows-10-end-of-support-what-to-do',
    title: 'Windows 10 support has ended: what your options actually are',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 16,
    testedOnBuild: '19045.5011',
    qualityScore: 90,
    affectedBuilds: ['19045'],
    metaTitle: 'Windows 10 end of support: your real options',
    metaDescription:
      'Windows 10 stopped receiving security updates on 14 October 2025. What that changes, what it does not, and the four paths open to you.',
    quickAnswer:
      'Windows 10 reached end of support on 14 October 2025. Your PC still works and still boots — it just stops receiving security updates. The four realistic options are upgrading to Windows 11, enrolling in Extended Security Updates, replacing the hardware, or accepting the risk on an isolated machine.',
    body: `Support for Windows 10 ended on **14 October 2025**. A lot of coverage framed this
as a cliff edge. It is not — nothing switched off, and no machine stopped working
that morning.

What actually changed is narrow and important: Microsoft no longer ships **security
updates** for Windows 10. Every vulnerability found from that date onward stays
unpatched on an unenrolled machine, permanently, and the gap widens every month.

## What still works

- The operating system boots and runs exactly as before.
- Your installed applications keep working.
- Microsoft Defender continues to receive **definition** updates for a period, which
  is not the same as patching the OS itself.
- Activation is unaffected. Nothing expires or deactivates.

## What stops

- **Security updates for Windows itself.** This is the whole issue.
- **Technical support** from Microsoft for Windows 10 problems.
- **Feature and quality updates.** Version 22H2 is the final version of Windows 10.

Over time, third-party software follows. Browsers, security products and business
applications drop support for unsupported operating systems on their own schedules.

## Option 1: Upgrade to Windows 11

Free, if the hardware qualifies. Windows 11 requires a supported 64-bit processor,
**4 GB** of RAM, **64 GB** of storage, UEFI with Secure Boot, and **TPM 2.0**.

1. Open **Settings > Windows Update**. An eligible device is offered the upgrade
   directly.
2. If nothing is offered, run Microsoft's **PC Health Check** app, which names the
   specific requirement that failed.
3. TPM is the usual blocker, and it is often present but disabled in firmware. Look
   for **TPM**, **fTPM**, **PTT** or **Security Device** in your BIOS/UEFI settings
   before concluding the machine is unsupported.

An in-place upgrade keeps files and applications.

## Option 2: Extended Security Updates

Microsoft offers a **consumer ESU** programme that extends security updates for
Windows 10 beyond the end-of-support date, for a limited period. Enrolment appears in
**Settings > Windows Update** on eligible devices running 22H2 and fully patched.

ESU delivers **security updates only** — no features, no general technical support.
Treat it as breathing room to plan a migration, not a destination.

## Option 3: Replace the hardware

For a machine that fails the Windows 11 requirements on the processor rather than a
firmware toggle, this is often the honest answer. A CPU that predates the supported
list will not become supported.

Before you buy, check whether the workload genuinely needs Windows. A machine used
for a browser and email has other options.

## Option 4: Keep running it, carefully

There are legitimate cases: a PC driving a lab instrument, a machine running software
that will not run anywhere else. If that is you, reduce exposure deliberately.

- Disconnect it from the internet, or restrict it to a segmented network.
- Do not use it for email or general browsing.
- Keep offline backups.

This is a containment strategy, not a fix. It is defensible for a fixed-purpose
machine and indefensible for a daily driver.

## What about bypassing the Windows 11 requirements?

It is possible to install Windows 11 on unsupported hardware. Microsoft's position is
that such devices are not entitled to updates and may not receive them, and you have
no recourse if a future update breaks the machine. For a primary computer holding
work or personal data, this trades a known problem for an unpredictable one.

## If you are not sure which version you have

Press \`Win + R\`, type \`winver\`, and press Enter. The dialog names the edition,
version and build. Windows 10 devices should read **Version 22H2** — anything older
was already out of support before the final date.`,
    faq: [
      {
        question: 'Will my Windows 10 PC stop working?',
        answer:
          'No. It boots, runs and activates exactly as before. What ends is the supply of security updates for the operating system.',
      },
      {
        question: 'Is upgrading to Windows 11 free?',
        answer:
          'Yes, for devices that meet the hardware requirements. The upgrade is offered through Windows Update and keeps your files and applications.',
      },
      {
        question: 'My PC says it is not compatible. Is that final?',
        answer:
          'Not always. TPM 2.0 and Secure Boot are frequently present but switched off in firmware. Check the BIOS/UEFI first. A processor that is not on the supported list, however, is a genuine hard stop.',
      },
      {
        question: 'How long does Extended Security Updates last?',
        answer:
          'The consumer programme is time-limited and security-only. Use it to schedule a migration rather than as a long-term plan.',
      },
      {
        question: 'Does Microsoft Defender still protect an unsupported machine?',
        answer:
          'Defender continues receiving threat definitions for a time, but definitions do not close holes in the operating system. Unpatched OS vulnerabilities stay open regardless of the antivirus in front of them.',
      },
    ],
    sources: [MS_WIN10_EOS, MS_LIFECYCLE, MS_RELEASE_HEALTH],
  },

  {
    slug: 'optional-preview-updates-explained',
    title: 'Optional preview updates: what they are and whether to install them',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 20,
    testedOnBuild: '26100.2314',
    qualityScore: 88,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Windows optional preview updates explained',
    metaDescription:
      'That "optional update available" entry with no security content is a preview release. What it contains, when it reaches everyone, and who should install it.',
    quickAnswer:
      'An optional preview update is a late-month, non-security preview of the fixes that ship to everyone in the following month’s Patch Tuesday cumulative update. It is safe for most people but skippable — if you wait two weeks, you get the same fixes automatically with more testing behind them.',
    body: `Late in the month, **Settings > Windows Update** sometimes shows an update that is
not installed automatically. It sits under a heading offering to download and install
it, and it contains no security fixes.

That is a **preview update**, and the distinction matters.

## The monthly release rhythm

Windows ships on a predictable cadence:

- **Second Tuesday of the month — "Patch Tuesday".** The cumulative update. Contains
  security fixes plus quality fixes. Installed automatically. Not optional in any
  meaningful sense.
- **Late in the same month — the preview.** Contains the *non-security* fixes that
  will be folded into next month's Patch Tuesday release. Offered as optional, and
  only installs if you ask for it.

So a preview update is a two-week early look at fixes you will receive anyway.

## What is actually in one

Preview updates carry quality and reliability work: fixes for bugs reported since
the last release, and often the first broad rollout of features that have been
finished for a while.

They do **not** carry security fixes. That is the defining characteristic. If an
update has security content, it ships on Patch Tuesday and installs automatically.

## Who should install them

**Install a preview if:**

- You are hitting a bug the release notes say it fixes. This is the strongest reason,
  and often the only one that matters.
- You want a feature it enables and you accept the risk.
- You maintain other people's machines and want two weeks of warning about what next
  month's update does.

**Skip it if:**

- Nothing is currently broken. The fixes reach you automatically in two weeks.
- The machine matters and downtime is expensive.
- You are on a work device — in most organisations, previews are not yours to install.

Preview updates receive less real-world exposure than the following month's release by
definition. The risk is small but not zero, and the reward for a machine with no
active problem is simply arriving earlier.

## Reading the release notes before you decide

1. Note the **KB number** shown next to the optional update.
2. Search that KB number on Microsoft's support site.
3. Read the fix list. If your problem is named, install it. If not, there is no
   concrete benefit to taking it early.

## The "get the latest updates as soon as they're available" toggle

**Settings > Windows Update** has a toggle that opts the device into receiving
non-security updates as they roll out, rather than waiting.

Turning it on means preview-quality fixes arrive automatically instead of waiting for
you to click. It is the same trade in a different shape: earlier fixes, less baking
time. Leave it off on a machine you depend on.

## How to tell what you already have

Press \`Win + R\`, type \`winver\`, and press Enter, then compare the build number
against Microsoft's release information page. Build numbers ending in a higher
revision than the current Patch Tuesday release mean a preview is installed.

Update history under **Settings > Windows Update > Update history** lists every KB
with its install date, which is the fastest way to see whether a preview went on.`,
    faq: [
      {
        question: 'Are preview updates the same as Windows Insider builds?',
        answer:
          'No, and the difference is large. Insider builds are pre-release versions of Windows on a separate channel. Preview updates are the finished, non-security portion of next month’s cumulative update for the version you already run.',
      },
      {
        question: 'Will skipping a preview update cause problems later?',
        answer:
          'No. Its contents are included in the next Patch Tuesday cumulative update, which installs automatically. Skipping costs you nothing but time.',
      },
      {
        question: 'Can I uninstall a preview update if it causes trouble?',
        answer:
          'Yes. Settings > Windows Update > Update history > Uninstall updates removes it like any other cumulative update.',
      },
      {
        question: 'Why does my PC not offer optional updates at all?',
        answer:
          'Managed and domain-joined devices usually have them suppressed by policy, and they only appear during the window when one has been released. Outside the last week or so of the month there is typically nothing to show.',
      },
    ],
    sources: [MS_RELEASE_HEALTH, MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'why-some-windows-upgrades-take-two-minutes',
    title: 'Why some Windows version upgrades take two minutes and others take an hour',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 25,
    testedOnBuild: '26100.2314',
    qualityScore: 87,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Enablement packages: why some Windows upgrades are instant',
    metaDescription:
      'Some Windows version upgrades install in two minutes with one restart. Others take an hour. The difference is whether the new version shares a servicing branch.',
    quickAnswer:
      'A version upgrade that installs in about two minutes with a single restart is an enablement package: the new code was already on your PC, delivered in earlier monthly updates and switched off. A full feature update rebuilds the operating system on disk, which is why it takes far longer.',
    body: `Two upgrades, both moving you to a new Windows version. One finishes in the time it
takes to make coffee. The other runs for an hour with three restarts and a rollback
risk.

The difference is not your hardware. It is whether the new version shares a
**servicing branch** with the one you are on.

## The enablement package

When two consecutive Windows versions are built from the same code base, Microsoft
ships the new version's code inside the ordinary monthly cumulative updates — in a
disabled state. Your PC has been quietly accumulating it for months.

The "upgrade" is then a tiny package whose only job is to flip the switch:

- Downloads in seconds; the payload is trivially small.
- Requires **one** restart.
- Changes the version string and the build number.
- Cannot roll back in the usual sense, because nothing was replaced.

This is why an upgrade can complete faster than a normal Patch Tuesday update. There
was nothing to install.

## The full feature update

When the new version is built on a different code base, none of that applies. Windows
must:

1. Download a complete operating system image, typically several gigabytes.
2. Stage the new build alongside the current one.
3. Restart into the setup environment and migrate settings, accounts and applications.
4. Restart again into the new build and finish configuration.
5. Keep the previous installation in \`C:\Windows.old\` so you can roll back.

Hence the duration, the multiple restarts, the **20 GB** free-space requirement — and
the fact that it can fail and roll back, which an enablement package essentially
cannot.

## How to tell which one you are being offered

- **Size.** An enablement package is measured in megabytes. A feature update is
  gigabytes.
- **Restart count.** One restart versus several.
- **Behaviour.** If **Settings > Windows Update** shows a version upgrade that
  downloads almost instantly, it is an enablement package.

## Why this matters practically

**For scheduling.** An enablement package can go in over lunch. A feature update
needs a window where losing the machine for an hour is acceptable.

**For rollback.** After a feature update you have roughly **ten days** to go back
through **Settings > System > Recovery**. After an enablement package there is no
equivalent — you would need to uninstall the update, and the version is not "undone"
the same way.

**For prerequisites.** Enablement packages require the device to be fully up to date
first. A machine that is months behind will not be offered one until it catches up.
If a quick upgrade is not appearing, install all pending updates and check again.

## Checking what you are running

Press \`Win + R\`, type \`winver\`, and press Enter. Two devices on the same servicing
branch report different version labels but closely related build numbers, which is the
visible fingerprint of the enablement-package model.`,
    faq: [
      {
        question: 'Is an enablement package a real upgrade?',
        answer:
          'Yes. Afterwards the device reports the new version, receives that version’s updates, and follows its support lifecycle. The installation is quick because the code arrived in advance.',
      },
      {
        question: 'Why is my PC not offered the quick upgrade?',
        answer:
          'Enablement packages require the device to be fully patched first. Install every pending update, restart, and check again. Managed devices may also be held back by policy.',
      },
      {
        question: 'Can I roll back after an enablement package?',
        answer:
          'Not through the ten-day "Go back" path that follows a feature update. The switch is delivered as an update, so removing it is an uninstall rather than a rollback.',
      },
      {
        question: 'Does a feature update delete my files?',
        answer:
          'No. It migrates your files, settings and applications, and keeps the previous installation in C:\\\\Windows.old for the rollback window. Back up anyway before an hour-long operating system replacement.',
      },
    ],
    sources: [MS_RELEASE_HEALTH, MS_LIFECYCLE],
  },

  /* ------------------------------------- update problems, second batch */
  {
    slug: 'windows-update-undoing-changes-loop',
    title: '"We couldn’t complete the updates, undoing changes" — how to break the loop',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 18,
    testedOnBuild: '26100.2314',
    qualityScore: 91,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Fix "We couldn’t complete the updates, undoing changes"',
    metaDescription:
      'Windows installs an update, restarts, then undoes it — over and over. How to get back to a usable desktop and stop the loop for good.',
    quickAnswer:
      'This message means the update failed during the restart phase and Windows reverted it, which is the safety net working. Let the rollback finish without powering off, then find the failing KB in update history, clear the update cache and repair the component store before retrying.',
    body: `Windows restarts to finish an update, sits at "Working on updates", then announces
**"We couldn't complete the updates. Undoing changes. Don't turn off your computer."**
Sometimes it lands back on the desktop. Sometimes it tries again on the next restart
and you are in a loop.

First, the reassuring part: the rollback is Windows protecting itself. A half-applied
update is dangerous; reverting to the last known-good state is correct behaviour.

> **Do not power off during "undoing changes".** This is the one genuinely risky
> moment in the whole process. Interrupting a rollback can leave the machine unable
> to boot. It can legitimately sit at the same percentage for 20 minutes or more —
> wait it out.

## Method 1: Get back to a working desktop

If the loop keeps repeating rather than resolving:

1. Let the current rollback finish completely.
2. If it returns to the sign-in screen, sign in and immediately go to
   **Settings > Windows Update > Advanced options > Pause updates**. Pause for a
   week. This stops the retry while you work.
3. If it never reaches the desktop, force Windows into the recovery environment:
   power the machine off with the power button during boot, three times in a row.
   The fourth boot loads **Automatic Repair**.
4. Choose **Advanced options > Startup Settings > Restart**, then press \`4\` for
   **Safe Mode**. Windows does not attempt updates in Safe Mode, which breaks the
   loop and gives you a usable system.

## Method 2: Identify what failed

Guessing wastes time. Get the KB number.

1. Open **Settings > Windows Update > Update history**.
2. Find the entry marked as failed and note its **KB number** and error code.
3. If your error code is specific — 0x800f0922, 0x80070002, 0x8007000d and so on —
   the targeted fix for that code is a better use of time than anything general.

## Method 3: Clear the cache and repair the component store

> **This clears update history and cached downloads.** Installed software is untouched.

1. Open an **elevated** Command Prompt.
2. Stop the services:

\`\`\`
net stop wuauserv
net stop bits
\`\`\`

3. Rename the cache:

\`\`\`
ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old
\`\`\`

4. Start them again:

\`\`\`
net start wuauserv
net start bits
\`\`\`

5. Then repair the component store — this is the step that stops a *repeating* loop:

\`\`\`
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
\`\`\`

6. Reboot, unpause updates, and retry.

## Method 4: Install the update by hand

If the same KB fails on a clean download:

1. Search the KB number at \`catalog.update.microsoft.com\`.
2. Download the \`.msu\` matching your architecture and Windows version.
3. Close everything and run it.

A manual install often produces a clearer error than Windows Update's generic message,
which is useful even when it also fails.

## If nothing worked

- **Disconnect peripherals and retry.** Docks and external drives cause failures in
  the restart phase specifically, because that is when drivers load.
- **Check free space.** Under 20 GB free on the system drive is a common cause of
  failures at exactly this stage.
- **Third-party security software.** Remove it with the vendor's official removal
  tool, retry, reinstall afterwards.
- **Consider an in-place repair install.** Mounting an ISO and running setup with
  **Keep personal files and apps** rebuilds servicing without touching your data. It
  is the last step before a reinstall, and it usually works.`,
    faq: [
      {
        question: 'How long should I let "undoing changes" run?',
        answer:
          'Give it at least an hour before considering intervention, and longer on a mechanical hard drive. The progress figure is an estimate and routinely stalls at one number for long stretches.',
      },
      {
        question: 'Is it safe to force a power off during the rollback?',
        answer:
          'No. This is the point where interrupting can leave the machine unbootable. Only resort to it if the same percentage has been frozen for several hours with no disk activity.',
      },
      {
        question: 'Why does the same update keep trying?',
        answer:
          'Windows re-offers a failed update at the next check. Until the underlying cause is fixed, each attempt fails the same way. Pausing updates stops the cycle while you fix it.',
      },
      {
        question: 'Did the failed update break anything?',
        answer:
          'The rollback exists to prevent exactly that. Once you are back at the desktop, the system is in its pre-update state with files and applications intact.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_ERROR_REFERENCE, MS_DISM],
  },

  {
    slug: 'windows-11-update-not-showing-up',
    title: 'Windows 11 update not showing up? Here is why it is being withheld',
    categorySlug: 'windows',
    authorSlug: 'maya-orsini',
    daysAgo: 21,
    testedOnBuild: '26100.2314',
    qualityScore: 89,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Windows update not showing up: safeguard holds explained',
    metaDescription:
      'Your PC says it is up to date while others have the new version. Usually that is a deliberate safeguard hold, a phased rollout, or a policy — not a fault.',
    quickAnswer:
      'A device that reports "You’re up to date" while others have a newer version is almost always being held back on purpose: a phased rollout, a safeguard hold on a known incompatibility, or an update policy. Check for a safeguard message in Windows Update before trying to force it.',
    body: `Someone you know has the new version. Your machine insists it is up to date. Nothing
is broken — updates are not delivered to everyone at once, and several mechanisms can
hold one back deliberately.

Work through these in order, because the last thing you should do is force it.

## Reason 1: The rollout is phased

Feature updates are released gradually. Microsoft starts with hardware configurations
it has the most telemetry for and widens the release as the data holds up.

**How to tell:** **Settings > Windows Update** shows the message that the update is on
its way but not ready for your device yet.

**What to do:** Wait. This is the system working. The update arrives on its own,
usually within weeks.

## Reason 2: A safeguard hold

This is the important one. When Microsoft confirms a specific problem — a driver that
breaks, an application that fails — it applies a **safeguard hold** blocking the
update on affected devices until the issue is fixed.

**How to tell:** Windows Update says the update is not offered because of a
compatibility issue with your device, sometimes naming the component.

**What to do:**

1. Check the **Windows release health** dashboard for your version. Active safeguard
   holds are published there with the reason.
2. Update the named driver or application if one is identified. The hold lifts
   automatically once the device no longer matches the affected configuration.
3. Otherwise wait for the fix.

> **Do not bypass a safeguard hold.** A hold means the update is *known* to cause
> problems on hardware like yours. Forcing it with installation media skips the check
> and installs the exact build that was blocked for you.

## Reason 3: The device does not meet the requirements

For a Windows 11 feature update the requirements are real and enforced: a supported
processor, **4 GB** RAM, **64 GB** storage, UEFI with Secure Boot, **TPM 2.0**.

**How to tell:** Run **PC Health Check**, which names the specific failing requirement.

**What to do:** TPM and Secure Boot are frequently disabled in firmware rather than
absent — check the BIOS/UEFI for **TPM**, **fTPM**, **PTT** or **Security Device**. An
unsupported processor is a genuine hard stop.

## Reason 4: A policy or pause is in effect

1. Open **Settings > Windows Update**. If updates are paused, resume them.
2. Check **Advanced options** for a deferral.
3. On a work machine, look for "Some settings are managed by your organization". That
   is definitive — the schedule is not yours to change.

Also confirm the machine is not on a **metered connection**, which suppresses
automatic downloads. **Settings > Network & internet**, select the connection, and
check **Metered connection**.

## Reason 5: The update path needs the machine current

Some upgrades are only offered to devices that are already fully patched. Install every
pending update, restart, then check again. A machine several months behind can be
skipped over entirely until it catches up.

## Method: Check properly before concluding anything

1. Press \`Win + R\`, type \`winver\`, press Enter, and write down your version and
   build.
2. Compare it against Microsoft's release information page.
3. Open **Settings > Windows Update** and read the exact wording of any message. The
   difference between "up to date", "on its way" and "not ready for your device" is
   the whole diagnosis.

## If nothing worked

- **Run the Windows Update troubleshooter.** **Settings > System > Troubleshoot >
  Other troubleshooters > Windows Update**. It resets components that block detection.
- **Reset the update components manually** if the troubleshooter reports nothing.
- **Consider whether you actually need to rush.** Being a few weeks behind on a
  feature update carries close to zero risk, as long as monthly security updates are
  installing. Those are the ones that matter, and they arrive on schedule regardless.`,
    faq: [
      {
        question: 'How long do safeguard holds last?',
        answer:
          'Until the underlying incompatibility is resolved, whether by Microsoft, a driver vendor or an application publisher. Some clear in days, others in months. The hold lifts automatically — you do not need to recheck anything.',
      },
      {
        question: 'Can I force the update with the Installation Assistant?',
        answer:
          'Technically yes, and that is precisely how people end up with the broken configuration the hold was protecting them from. Do not do it while a hold naming your hardware is active.',
      },
      {
        question: 'Why do two identical PCs get updates at different times?',
        answer:
          'Phased rollouts group devices by hardware configuration and telemetry, not by purchase batch. Two machines that look identical can differ in driver versions or installed software.',
      },
      {
        question: 'Is it risky to be behind on a feature update?',
        answer:
          'Not particularly, provided monthly security updates are still installing. Feature updates add capability; the security fixes ship separately and continue arriving for supported versions.',
      },
    ],
    sources: [MS_SAFEGUARD, MS_RELEASE_HEALTH, MS_UPDATE_TROUBLESHOOT],
  },

  {
    slug: 'windows-update-asks-for-bitlocker-recovery-key',
    title: 'Windows update asks for a BitLocker recovery key: what to do',
    categorySlug: 'windows',
    authorSlug: 'devan-brooks',
    daysAgo: 24,
    testedOnBuild: '26100.2314',
    qualityScore: 92,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'BitLocker recovery key prompt after a Windows update',
    metaDescription:
      'A blue recovery screen after an update is not a lost PC. Where to find your BitLocker recovery key, and how to stop the prompt recurring.',
    quickAnswer:
      'A BitLocker recovery prompt after an update means the boot measurements changed and TPM would not release the key automatically. Your data is fine. Sign in at account.microsoft.com/devices on another device to retrieve the 48-digit key, enter it, and the PC boots normally.',
    body: `A blue screen headed **BitLocker recovery** asking for a 48-digit key, after an update
you did not think was risky. It looks catastrophic. It is not.

BitLocker seals the disk encryption key to the **TPM**, and the TPM only releases it
when the boot environment measures as expected. An update that touches boot components,
firmware or Secure Boot changes those measurements, so the TPM declines and BitLocker
falls back to asking a human. That is the security model working exactly as designed.

> **Your data is not lost and the drive is not damaged.** The key exists. The rest of
> this is about finding it.

## Method 1: Retrieve the key from your Microsoft account

For most personal PCs, BitLocker was enabled with a Microsoft account and the key was
backed up automatically.

1. On a **different device** — phone, tablet, another computer — go to
   \`account.microsoft.com/devices/recoverykey\`.
2. Sign in with the Microsoft account used on the locked PC.
3. You will see a list of recovery keys with **Key ID** values.
4. On the locked PC, note the **Key ID** shown on the recovery screen and match its
   first characters against the list.
5. Type the 48-digit key on the locked PC. It is digits only, in groups of six.

Matching the Key ID matters — an account with several devices lists several keys, and
the wrong one will simply be rejected.

## Method 2: Other places the key may be

If it is not in a Microsoft account, try these in order:

- **A work or school account.** For a managed device the key is usually escrowed in
  Microsoft Entra ID or Intune. Sign in at \`account.activedirectory.windowsazure.com\`
  and check your device, or contact your IT desk — they can read it out.
- **A saved file.** BitLocker offers to save the key as a \`.txt\` file at setup. Look
  on USB drives and in cloud storage for a file named like
  \`BitLocker Recovery Key <ID>.txt\`.
- **A printout.** Saving to PDF or paper is offered during setup and people take it.
- **A USB flash drive.** The key can be stored on a stick to be inserted at boot.

## Method 3: Stop it happening at the next update

Once you are back in Windows, reduce the chance of a repeat.

1. Confirm where your key is backed up. Open an **elevated** Command Prompt and run:

\`\`\`
manage-bde -protectors -get C:
\`\`\`

   This shows the protectors on the drive and the recovery password ID.

2. Save a fresh copy somewhere you can reach without this PC.
3. Before a **firmware or BIOS update** — the most reliable way to trigger this —
   suspend BitLocker first:

\`\`\`
manage-bde -protectors -disable C: -RebootCount 1
\`\`\`

   BitLocker resumes automatically after the next restart. The drive stays encrypted
   throughout; only the automatic unlock is suspended.

4. Use **Settings > Privacy & security > Device encryption** or **BitLocker Drive
   Encryption** in Control Panel to back the key up again if anything changed.

## If nothing worked

- **You cannot find the key anywhere.** There is no bypass, and that is the entire
  point of disk encryption. Without the key the data is unrecoverable, and the only
  path forward is a clean install, which erases the drive. Exhaust every account and
  storage location first.
- **The key is rejected.** Check the Key ID against the one on screen. A key from a
  different device will not work no matter how carefully it is typed.
- **It asks on every single boot.** Something is measuring differently each time —
  often a firmware setting stuck mid-change, or Secure Boot toggled off. In Windows,
  suspend and resume BitLocker to reseal to the current configuration:

\`\`\`
manage-bde -protectors -disable C:
manage-bde -protectors -enable C:
\`\`\``,
    faq: [
      {
        question: 'Why did an update trigger this?',
        answer:
          'BitLocker releases its key only when the boot environment measures as expected. Updates touching boot components, Secure Boot or firmware change those measurements, so the TPM declines and BitLocker asks a person instead.',
      },
      {
        question: 'Is my data lost?',
        answer:
          'No. The drive is intact and encrypted. Entering the correct recovery key unlocks it and Windows boots normally.',
      },
      {
        question: 'I never turned BitLocker on. Why is my drive encrypted?',
        answer:
          'Many Windows devices enable device encryption automatically when signed in with a Microsoft account. The key is backed up to that account at the same time, which is why the online lookup usually works.',
      },
      {
        question: 'What if there is no key in my Microsoft account?',
        answer:
          'Check every Microsoft account you own — keys are stored per account, and people commonly set the PC up with a different one. Then check work accounts, saved text files and USB drives.',
      },
      {
        question: 'Should I turn BitLocker off to avoid this?',
        answer:
          'No. It protects your data if the machine is lost or stolen. The better habit is knowing where the key is and suspending BitLocker before firmware updates.',
      },
    ],
    sources: [MS_BITLOCKER_RECOVERY, MS_UPDATE_TROUBLESHOOT],
  },

  /* ------------------------------------ app not working, second batch */
  {
    slug: 'no-sound-after-windows-update',
    title: 'No sound after a Windows update: how to get audio back',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 23,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'No sound after a Windows update? Fix audio',
    metaDescription:
      'Audio stops working after an update, usually because the output device was switched or the driver was replaced. Six checks, cheapest first.',
    quickAnswer:
      'After an update, the most common cause of silence is that Windows switched the default output device — often to an HDMI monitor with no speakers. Check the output picker first, then restart the audio service, then roll back the audio driver.',
    body: `Sound worked yesterday. An update installed overnight. Now nothing.

Resist reinstalling drivers as a first move. In most cases the hardware and driver are
fine and Windows is simply sending audio somewhere you cannot hear it.

## Method 1: Check where the sound is going

This resolves more of these cases than everything else combined.

1. Click the **speaker icon** in the taskbar.
2. Click the **arrow** next to the volume slider to expand the output list.
3. Look at what is selected. If it names your **monitor**, a **dock**, or an HDMI
   output, that is the problem — Windows re-enumerated devices during the update and
   picked a different default.
4. Select your actual speakers or headphones.

Also check that the volume is not muted, and that the app itself is not muted:
right-click the speaker icon and choose **Open Volume mixer** to see per-application
levels. Updates occasionally reset mixer state.

## Method 2: Restart the audio services

A quick, non-destructive reset.

1. Press \`Win + R\`, type \`services.msc\`, and press Enter.
2. Find **Windows Audio**. Right-click it and choose **Restart**.
3. Do the same for **Windows Audio Endpoint Builder**.
4. Check that both have **Startup type** set to **Automatic**. If either is stopped
   and set to Manual, set it to Automatic and start it.

Test sound again before moving on.

## Method 3: Run the audio troubleshooter

Worth the two minutes — it catches disabled devices and wrong default formats.

1. Go to **Settings > System > Sound**.
2. Scroll to **Advanced** and select **Troubleshoot common sound problems**, then
   **Output devices**.
3. Follow the prompts and apply what it suggests.

## Method 4: Roll back the audio driver

If the update replaced a working manufacturer driver with a generic one, this is the
fix that sticks.

1. Press \`Win + X\` and open **Device Manager**.
2. Expand **Sound, video and game controllers**.
3. Right-click your audio device — usually **Realtek**, **Intel Smart Sound
   Technology**, or **High Definition Audio Device** — and choose **Properties**.
4. On the **Driver** tab, click **Roll Back Driver** if it is available.
5. Give a reason when prompted and restart.

If **Roll Back Driver** is greyed out, there is no previous driver stored. Move on.

## Method 5: Reinstall the driver

1. In **Device Manager**, right-click the audio device and choose **Uninstall device**.
2. If offered, tick **Attempt to remove the driver for this device**.
3. Restart. Windows reinstalls a working driver automatically on boot.
4. If sound is still wrong, download the audio driver from your **PC manufacturer's**
   support page — not the chipset vendor's generic package — and install it.

Laptop audio in particular depends on manufacturer-tuned drivers for speaker
configuration. The generic driver often produces quiet or distorted output rather than
silence.

## Method 6: Check for a disabled device

Sometimes the output device is present but switched off.

1. Right-click the speaker icon and choose **Sound settings**.
2. Under **Advanced**, open **More sound settings**.
3. On the **Playback** tab, right-click in the empty area and tick **Show Disabled
   Devices**.
4. If your speakers appear greyed out, right-click and choose **Enable**, then **Set
   as Default Device**.

## If nothing worked

- **Uninstall the update.** If audio broke at a specific update, remove it via
  **Settings > Windows Update > Update history > Uninstall updates** and pause updates
  while you wait for a fix.
- **Check the hardware.** Plug headphones directly into the PC. If they work and the
  speakers do not, the problem is not the update.
- **Bluetooth audio is a separate path.** If only a Bluetooth headset is silent, remove
  the pairing in **Settings > Bluetooth & devices** and pair it again. Updates commonly
  disturb stored pairings.`,
    faq: [
      {
        question: 'Why did the update change my default speakers?',
        answer:
          'Updates re-enumerate audio endpoints. If a monitor or dock exposes an audio output, Windows can select it as default even though nothing is connected to it, and everything then plays silently.',
      },
      {
        question: 'Should I uninstall the update straight away?',
        answer:
          'Not as a first step. Uninstalling removes security fixes and the cause is usually a device selection or driver issue you can fix in a couple of minutes.',
      },
      {
        question: 'Is the generic High Definition Audio Device driver a problem?',
        answer:
          'It provides basic output but lacks manufacturer tuning for speaker layout and enhancements. Sound often works but is quiet or thin. Installing the PC maker’s driver restores it.',
      },
      {
        question: 'Only one application has no sound. Now what?',
        answer:
          'Open Volume mixer from the speaker icon and check that application’s level and its assigned output device. Windows keeps per-application audio routing, and updates can reset it.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_RELEASE_HEALTH],
  },

  {
    slug: 'file-explorer-crashing-after-windows-update',
    title: 'File Explorer crashing or freezing after a Windows update',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 27,
    testedOnBuild: '26100.2314',
    qualityScore: 89,
    affectedBuilds: ['26100', '22631'],
    metaTitle: 'Fix File Explorer crashing after a Windows update',
    metaDescription:
      'Explorer restarting, freezing on right-click or hanging on a folder is usually a third-party shell extension. How to find which one.',
    quickAnswer:
      'File Explorer crashes after an update are usually caused by a third-party shell extension — cloud storage, archive tools or antivirus menu entries — that the new build no longer tolerates. Clear the thumbnail cache first, then disable non-Microsoft shell extensions to find the culprit.',
    body: `File Explorer restarts itself, the taskbar flashes, right-click hangs for ten seconds,
or a particular folder freezes every time. All of these appeared after an update.

Explorer is not just a file browser — it hosts the desktop, the taskbar and every
context menu, and it loads third-party code called **shell extensions** into its own
process. When one of those misbehaves, Explorer takes the blame.

## Method 1: Restart Explorer and clear its caches

Start here; it fixes the transient version.

1. Press \`Ctrl + Shift + Esc\` to open **Task Manager**.
2. Find **Windows Explorer**, right-click it and choose **Restart**.

If the problem returns, clear the caches that updates commonly leave stale:

3. Press \`Win + R\`, type \`cleanmgr\`, and press Enter.
4. Select your system drive, then tick **Thumbnails** and **Temporary files**.
5. Click **OK** and let it run.

A corrupt thumbnail cache reliably produces crashes in folders full of photos or
videos while every other folder behaves.

## Method 2: Rule out the folder itself

If it only crashes in specific folders:

1. Open the problem folder.
2. Right-click empty space, choose **View**, and switch to **Details** or **List**.
3. If it stops crashing, the cause is thumbnail generation for media in that folder —
   often a single corrupt file or one needing a codec that was changed by the update.
4. To make it permanent for all folders: **Explorer > … > Options > View tab**, tick
   **Always show icons, never thumbnails**.

## Method 3: Find the offending shell extension

This is the real fix for persistent crashes, particularly on right-click.

1. Restart into **Safe Mode**: **Settings > System > Recovery > Advanced startup >
   Restart now**, then **Troubleshoot > Advanced options > Startup Settings >
   Restart**, then press \`4\`.
2. Test Explorer in Safe Mode. If it behaves, a third-party extension is confirmed —
   Safe Mode loads none of them.
3. Back in normal Windows, the usual suspects are:
   - Cloud storage clients (OneDrive alternatives, Dropbox, Google Drive)
   - Archive tools that add context-menu entries
   - Antivirus "scan with…" menu items
   - Anything that added a right-click entry recently
4. Uninstall or update the most recently installed one and test. Vendors normally ship
   a compatibility fix within a few weeks of a new build.

Cloud clients are the single most frequent cause, because they hook Explorer deeply to
draw sync-status overlays on icons.

## Method 4: Repair system files

If Safe Mode crashes too, the problem is in Windows itself.

1. Open an **elevated** Command Prompt.
2. Run:

\`\`\`
sfc /scannow
DISM /Online /Cleanup-Image /RestoreHealth
\`\`\`

3. Restart.

## Method 5: Check reliability history for the failing module

This turns guesswork into a name.

1. Press \`Win + R\`, type \`perfmon /rel\`, and press Enter.
2. Find the Explorer crashes on the timeline and click one.
3. Select **View technical details**.
4. Read the **Faulting module name**. If it is a \`.dll\` that is not a Microsoft
   component, search that filename — it usually identifies the product immediately.

## If nothing worked

- **Create a new user profile.** **Settings > Accounts > Other users > Add account**.
  If Explorer is stable there, the problem is in your profile's shell settings rather
  than the system.
- **Uninstall the update.** **Settings > Windows Update > Update history > Uninstall
  updates**, then pause updates while the vendor catches up.
- **Reset folder view settings.** **Explorer > … > Options > View tab > Reset Folders**
  clears per-folder state that can survive everything else.`,
    faq: [
      {
        question: 'Why would an update break File Explorer?',
        answer:
          'Explorer loads third-party shell extensions into its own process. When an update changes shell interfaces, an extension built against the old behaviour can crash the host, which looks like Explorer failing.',
      },
      {
        question: 'How do I know it is a shell extension and not Windows?',
        answer:
          'Test in Safe Mode, which loads no third-party extensions. Stable in Safe Mode and crashing normally is close to conclusive.',
      },
      {
        question: 'Explorer only freezes on right-click. Does that narrow it down?',
        answer:
          'Considerably. Context-menu handlers are a specific class of extension, so look at anything that added a right-click entry — archive tools, antivirus and cloud clients first.',
      },
      {
        question: 'Is clearing the thumbnail cache safe?',
        answer:
          'Yes. Thumbnails are regenerated from your files on demand. The first visit to a large media folder is slower afterwards, and nothing is lost.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_DISM],
  },

  {
    slug: 'wifi-not-working-after-windows-update',
    title: 'Wi-Fi not working after a Windows update: how to restore the connection',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 30,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'Fix Wi-Fi not working after a Windows update',
    metaDescription:
      'Wi-Fi missing, stuck on "No internet" or dropping after an update. Driver rollback, TCP/IP reset and the settings updates commonly change.',
    quickAnswer:
      'After an update, Wi-Fi problems are usually a replaced wireless driver or a reset network stack. Roll back the Wi-Fi driver from Device Manager first; if the adapter is missing entirely, scan for hardware changes, then reset TCP/IP and Winsock.',
    body: `The update finished, the machine restarted, and now Wi-Fi is gone from the taskbar,
or it connects but reports **"No internet, secured"**, or it drops every few minutes.

Fix this in order. The first two methods need no internet, which matters here.

## Method 1: Confirm the adapter still exists

1. Press \`Win + X\` and open **Device Manager**.
2. Expand **Network adapters**.
3. Look for your wireless adapter — usually **Intel Wi-Fi**, **Qualcomm Atheros**,
   **Realtek** or **MediaTek**.

**If it is missing:** click **Action > Scan for hardware changes**. Also check
**View > Show hidden devices** and look under **Other devices** for an unknown device
with a warning triangle — that is the adapter with no working driver.

**If it has a warning triangle:** the driver failed to load. Go to Method 2.

**If it looks normal:** skip to Method 3.

Also check the physical Wi-Fi switch or \`Fn\` key on laptops, and confirm
**Airplane mode** is off in **Settings > Network & internet**. Updates have been known
to leave airplane mode enabled after restart.

## Method 2: Roll back or reinstall the wireless driver

The most common cause: the update replaced a working manufacturer driver with a
generic one.

1. In **Device Manager**, right-click the wireless adapter and choose **Properties**.
2. On the **Driver** tab, click **Roll Back Driver** if available. Give a reason and
   restart.
3. If roll back is greyed out, right-click the adapter and choose **Uninstall device**.
   Do **not** tick "remove the driver software" unless you already have a replacement
   downloaded.
4. Restart. Windows reinstalls the driver automatically.

> **Download the driver first if you can.** Get the wireless driver from your PC
> manufacturer's support page onto a USB stick using a phone or another computer,
> before uninstalling anything. A machine with no Wi-Fi cannot download its own Wi-Fi
> driver.

## Method 3: Reset the network stack

For "connected but no internet", this is the fix.

1. Open an **elevated** Command Prompt.
2. Run each command in turn:

\`\`\`
netsh winsock reset
netsh int ip reset
ipconfig /release
ipconfig /renew
ipconfig /flushdns
\`\`\`

3. **Restart the PC.** The Winsock reset does not take effect until you do.

## Method 4: Forget and rejoin the network

Stored profiles can be left inconsistent by an update.

1. Go to **Settings > Network & internet > Wi-Fi > Manage known networks**.
2. Select your network and choose **Forget**.
3. Reconnect and enter the password again.

## Method 5: Use the built-in network reset

> **This removes all network adapters and resets networking to defaults.** You will
> re-enter Wi-Fi passwords, and VPN clients usually need reconfiguring.

1. Go to **Settings > Network & internet > Advanced network settings**.
2. Select **Network reset**, then **Reset now**.
3. The PC restarts after a short delay.

Keep this for last — it is effective but it clears VPN and static IP configuration too.

## If nothing worked

- **Check power management.** In **Device Manager > adapter Properties > Power
  Management**, untick **Allow the computer to turn off this device to save power**.
  This is the usual cause of a connection that drops after idling.
- **Check the router, not the PC.** Test another device on the same network. If
  everything is slow, the update is a coincidence.
- **Uninstall the update.** If the adapter genuinely stopped working at a specific KB,
  remove it via **Update history > Uninstall updates** and pause updates.
- **Use a USB Wi-Fi adapter or Ethernet temporarily.** A cheap USB dongle gets the
  machine online so you can download the proper driver.`,
    faq: [
      {
        question: 'Why did the update change my Wi-Fi driver?',
        answer:
          'Windows Update distributes driver updates alongside system updates. A newer driver can replace a manufacturer-tuned one, and on some adapters the replacement behaves worse than what it replaced.',
      },
      {
        question: 'What does "No internet, secured" mean?',
        answer:
          'The PC joined the Wi-Fi network successfully but cannot reach the internet through it. That points at the IP configuration or DNS rather than the wireless connection, which is what Method 3 resets.',
      },
      {
        question: 'Will network reset delete anything important?',
        answer:
          'It removes and reinstalls network adapters and clears saved networks, VPN entries and static IP settings. Personal files are untouched, but have your Wi-Fi password to hand.',
      },
      {
        question: 'The adapter vanished completely. Is the hardware dead?',
        answer:
          'Rarely. A driver that fails to load makes the adapter disappear from the normal list. Scan for hardware changes and check hidden devices before assuming a hardware fault.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_RELEASE_HEALTH],
  },

  /* -------------------------------------------- how-to, second batch */
  {
    slug: 'how-to-check-your-windows-version-and-build',
    title: 'How to check your Windows version and build number',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 26,
    testedOnBuild: '26100.2314',
    qualityScore: 88,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'How to check your Windows version and build number',
    metaDescription:
      'Four ways to find your Windows edition, version and exact build — and what each part of the number actually means.',
    quickAnswer:
      'Press Win + R, type winver and press Enter. The dialog shows your edition, version (such as 24H2) and full build number. For a copyable version, use Settings > System > About, or run "systeminfo" in a terminal.',
    body: `Almost every troubleshooting guide starts by asking which build you are on, because
the answer changes the advice. Here is how to get it, and how to read it.

## Method 1: winver (fastest)

1. Press \`Win + R\`.
2. Type \`winver\` and press Enter.

A small dialog reports something like:

\`\`\`
Version 24H2 (OS Build 26100.2314)
\`\`\`

That single line contains everything most guides need: the **version label** and the
**full build number**.

## Method 2: Settings (copyable, and includes hardware)

1. Open **Settings > System > About**.
2. Under **Windows specifications** you will see **Edition**, **Version**,
   **Installed on** and **OS build**.
3. Click **Copy** to put the whole block on the clipboard — useful when you are
   reporting a problem to someone else.

**Device specifications** above it gives the processor, RAM and system type
(64-bit or ARM), which matters when downloading updates from the Microsoft Update
Catalog.

## Method 3: The command line

Useful in a script, or over a remote session.

For the short version, open **Command Prompt** or **PowerShell** and run:

\`\`\`
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
\`\`\`

In PowerShell specifically:

\`\`\`
Get-ComputerInfo -Property WindowsProductName,WindowsVersion,OsBuildNumber
\`\`\`

Or read it straight from the registry:

\`\`\`
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v DisplayVersion
\`\`\`

## How to read the number

Take **Version 24H2 (OS Build 26100.2314)**:

- **24H2** — the *version*, meaning the second half of 2024 release. This is what
  support lifecycles are tied to.
- **26100** — the *build*, which identifies the underlying code base. It stays fixed
  for the life of a version.
- **.2314** — the *revision* or update build revision (UBR). This increases with every
  cumulative update, so it is what changes on Patch Tuesday.

When a guide says "affected builds 26100 and 22631", it means the version families. When
release health says a fix shipped in 26100.2314, it means the revision — anything lower
does not have the fix.

## Which part do you need?

- **Checking whether a fix has reached you:** the full number including the revision.
- **Checking whether a guide applies:** the build (26100, 22631, 19045).
- **Checking support lifecycle:** the version label (24H2, 23H2, 22H2).
- **Downloading from the Update Catalog:** the version label *and* the architecture
  from **Settings > System > About**.

## Windows 10 or Windows 11?

\`winver\` states it directly in the dialog text. If you only have a build number, the
dividing line is **22000**: builds below it are Windows 10 — 19045 is the final one —
and 22000 or higher is Windows 11.

## Reading the number on someone else's machine

Most of the time you are asking for this because you are helping someone else, and
"run winver and tell me what it says" produces a photograph of a dialog with the
important part cut off.

Ask for the **Copy** button instead:

1. **Settings > System > About**.
2. Click **Copy** under Windows specifications.
3. Paste it into the message.

That yields the edition, version, install date, build and experience pack in text
you can actually read, and it removes the transcription errors that come with
reading a build number aloud.

## What to do when the version looks wrong

Two situations come up often enough to be worth naming.

**The version is older than you expect.** The machine has updates paused, is on a
metered connection, or has not been able to complete a feature update. Check
**Settings > Windows Update** and read the exact wording of any message there.

**The build revision is far behind the current one.** Monthly updates are not
installing. That is a servicing problem rather than a version problem, and update
history will usually show the failing entry and its error code.

## Why this is the first question in every guide

Troubleshooting advice is version-specific in ways that are easy to miss:

- **Settings paths move** between versions. A guide written for 22H2 may name a
  page that no longer exists.
- **Fixes ship in specific revisions.** "Fixed in 26100.2314" is meaningless unless
  you know your own number.
- **Downloads are architecture-specific.** The Microsoft Update Catalog offers x64
  and ARM64 builds, and installing the wrong one simply fails.
- **Support status depends on the version label**, not the product name.

Getting the number first turns "this guide did not work" into "this guide does not
apply to me", which is a much more useful place to be.

## When the machine will not boot

You can still get the version from the recovery environment, which is useful when
you are trying to work out which ISO to repair a machine with.

From **Troubleshoot > Advanced options > Command Prompt**, run:

\`\`\`
reg load HKLM\\TEMP C:\\Windows\\System32\\config\\SOFTWARE
reg query "HKLM\\TEMP\\Microsoft\\Windows NT\\CurrentVersion" /v DisplayVersion
reg unload HKLM\\TEMP
\`\`\`

Adjust the drive letter if Windows is not on \`C:\` in the recovery environment,
which is common — check with \`dir C:\\Windows\` first.

## Conclusion

\`winver\` answers this in two seconds, **Settings > System > About** gives you the
same thing in a form you can paste, and the command line covers scripts and remote
sessions. Between the version label, the build and the revision you can tell
whether a guide applies, whether a fix has reached you, and whether the machine is
still supported.

**Next step:** run \`winver\` now and note the full number including the digits after
the dot. Every other troubleshooting guide on this site assumes you have it.`,
    faq: [
      {
        question: 'What is the difference between version and build?',
        answer:
          'The version is the marketing label tied to the support lifecycle, such as 24H2. The build identifies the code base, such as 26100, and the digits after the dot are the revision that increases with each monthly update.',
      },
      {
        question: 'Why does my build number keep changing?',
        answer:
          'Only the part after the dot changes. Every cumulative update raises that revision, which is how you can tell whether a specific fix is installed.',
      },
      {
        question: 'How do I know if I am on 32-bit or 64-bit?',
        answer:
          'Settings > System > About, under Device specifications, shows System type. Almost all modern PCs are 64-bit; ARM-based devices report ARM64, which needs different downloads.',
      },
      {
        question: 'Does winver work on Windows 10 too?',
        answer:
          'Yes. It works on every supported version of Windows and reports the same three pieces of information.',
      },
    ],
    sources: [MS_RELEASE_HEALTH, MS_LIFECYCLE],
  },

  {
    slug: 'how-to-free-up-space-for-a-windows-update',
    title: 'How to free up space for a Windows update',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 29,
    testedOnBuild: '26100.2314',
    qualityScore: 89,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'How to free up space for a Windows update',
    metaDescription:
      'Feature updates need around 20 GB free. Where to reclaim it safely, in order — and which folders you should leave alone.',
    quickAnswer:
      'A feature update needs roughly 20 GB of free space on the system drive; a cumulative update needs far less. Start with Storage Sense and Disk Cleanup, remove previous Windows installations only if you no longer need to roll back, then move personal files off the drive.',
    body: `Updates fail on full drives, often with a misleading error code that sends people
chasing servicing problems that do not exist.

Rough targets: a **cumulative update** wants a few gigabytes free. A **feature update**
wants about **20 GB**, because it stages an entire operating system image alongside the
current one.

Work down this list until you have the room. It is ordered safest first.

## Step 1: See where the space went

1. Open **Settings > System > Storage**.
2. Wait for the categories to populate — Apps, Temporary files, Documents and so on.
3. Click **Show more categories** for the full breakdown.

Fix what the numbers actually show rather than guessing.

## Step 2: Turn on Storage Sense

1. In **Settings > System > Storage**, switch **Storage Sense** on.
2. Click it to configure. It can empty the Recycle Bin and clear the Downloads folder
   on a schedule.
3. Click **Run Storage Sense now** at the bottom.

> **Check the Downloads setting before enabling it.** Storage Sense can delete files in
> Downloads that have not been opened for a set number of days. If you keep things
> there long-term, set that option to **Never**.

## Step 3: Clean up temporary and update files

1. In **Settings > System > Storage**, select **Temporary files**.
2. Safe to tick:
   - **Windows Update Cleanup** — often several gigabytes
   - **Delivery Optimization Files**
   - **Thumbnails**
   - **Temporary Internet Files**
   - **Recycle Bin**, once you have checked its contents
3. Click **Remove files**.

**Windows Update Cleanup** alone frequently reclaims 3–8 GB on a machine that has been
updating for a year or two.

## Step 4: Uninstall what you do not use

1. Open **Settings > Apps > Installed apps**.
2. Sort by **Size**.
3. Uninstall what you genuinely do not use. Games and creative applications dominate
   this list.

## Step 5: Remove previous Windows installations

> **This ends your ability to roll back a feature update.** Only do it if the current
> build has been stable for a while and you are certain you will not need to go back.

1. Press \`Win + R\`, type \`cleanmgr\`, and press Enter.
2. Select the system drive and click **OK**.
3. Click **Clean up system files**.
4. Tick **Previous Windows installation(s)** and **Windows Update Cleanup**.
5. Click **OK**.

This is the single biggest win available — \`C:\\Windows.old\` is routinely 15–25 GB —
and it is also the most irreversible. Windows deletes it automatically after ten days
anyway.

## Step 6: Move personal files off the system drive

1. In **Settings > System > Storage > Advanced storage settings**, open
   **Where new content is saved** and point new files at a second drive.
2. Move existing large folders — video, photo libraries, game installs — to another
   drive or external storage.
3. If you use OneDrive, right-click a folder in File Explorer and choose **Free up
   space** to keep files in the cloud while leaving placeholders.

## Step 7: Use external storage during the update

If the drive is small and genuinely full, Windows Setup can borrow space:

1. Connect a USB drive with at least 10 GB free.
2. When the update reports insufficient space, choose the option to use external
   storage.
3. Leave it connected until the update finishes.

## What not to delete

- **C:\\Windows\\System32** or anything inside it. Obvious, but people are told to
  otherwise.
- **The System Reserved or Recovery partitions.** They are small and necessary.
- **The pagefile or hibernation file by hand.** If you want the ~8–16 GB back from
  hibernation, disable it properly from an **elevated** Command Prompt:

\`\`\`
powercfg /hibernate off
\`\`\`

  You lose hibernate and fast startup. Re-enable with \`powercfg /hibernate on\`.
- **Random files in C:\\Windows\\Temp** while an update is mid-flight. Let the cleanup
  tools handle it.`,
    faq: [
      {
        question: 'How much space does a Windows update actually need?',
        answer:
          'A monthly cumulative update needs a few gigabytes. A feature update wants around 20 GB free on the system drive, because it stages a complete new operating system image before switching over.',
      },
      {
        question: 'Is it safe to delete the Windows.old folder?',
        answer:
          'It is safe for the system, but it ends your ability to roll back to the previous version. Windows removes it automatically after about ten days.',
      },
      {
        question: 'Will Disk Cleanup delete my personal files?',
        answer:
          'Not the categories listed here. The only one to read carefully is Recycle Bin, which holds things you deleted but may still want. Downloads is a separate risk if Storage Sense is set to clear it.',
      },
      {
        question: 'Can I use a USB drive instead of freeing space?',
        answer:
          'For feature updates, yes — Windows Setup offers to use external storage when the system drive is short. Keep the drive connected for the whole process.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_DELIVERY_OPTIMIZATION],
  },

  {
    slug: 'how-to-roll-back-a-windows-feature-update',
    title: 'How to roll back a Windows feature update',
    categorySlug: 'windows',
    authorSlug: 'priya-raghunathan',
    daysAgo: 32,
    testedOnBuild: '26100.2314',
    qualityScore: 90,
    affectedBuilds: ['26100', '22631', '19045'],
    metaTitle: 'How to roll back a Windows feature update',
    metaDescription:
      'You have about ten days to go back to your previous Windows version. How to do it, what survives, and what to do once the window closes.',
    quickAnswer:
      'Go to Settings > System > Recovery and use "Go back". The option is available for about ten days after a feature update and keeps your personal files. Once the window closes or Windows.old is deleted, the only route back is a clean install from installation media.',
    body: `A feature update installed, something important stopped working, and you want the
previous version back. Windows keeps that option open — but not indefinitely.

> **This is not the same as uninstalling a monthly update.** Rolling back reverts an
> entire version change. To remove a single cumulative update, use
> **Settings > Windows Update > Update history > Uninstall updates** instead.

## Before you start

- **Back up your files.** The rollback is designed to preserve them, but any operation
  that replaces the operating system deserves a backup.
- **Know your password.** You need the password that was in use **before** the update.
  If you changed it after upgrading, the old one is what signs you in afterwards.
- **Plug in the laptop.** Losing power mid-rollback is the one way to make this go
  badly.
- **Set aside 30 minutes or so.** It restarts several times.

## Method 1: Go back (within the rollback window)

1. Open **Settings > System > Recovery**.
2. Find **Go back** under **Recovery options** and click it.

   If the button is greyed out or missing, the window has expired or \`Windows.old\`
   has been removed. Go to Method 3.

3. Choose a reason when asked. It is telemetry; any answer works.
4. Decline the offer to check for updates instead — that is not what you want here.
5. Read the warnings. You will be told that applications and settings changed since the
   upgrade may be lost and that you need your old password.
6. Click **Go back to earlier build** and let it run.

The PC restarts and reverts. Do not interrupt it.

## Method 2: Go back from the recovery environment

If the machine will not boot far enough to reach Settings:

1. Force the recovery environment: power off with the power button during boot, three
   times in a row. The fourth boot loads **Automatic Repair**.
2. Choose **Advanced options > Troubleshoot > Advanced options**.
3. Select **Uninstall Updates**.
4. Choose **Uninstall latest feature update**.
5. Confirm and let it complete.

The same option offers **Uninstall latest quality update**, which is the one to pick if
a monthly update rather than a version change broke things.

## Method 3: Once the window has closed

After roughly ten days — or immediately, if Disk Cleanup removed previous Windows
installations — the rollback path is gone. Remaining options:

- **Restore from a system image**, if you made one before upgrading.
- **Clean install the older version** from installation media. This **erases the
  drive**. Back up everything first, and check the older version is still supported
  before committing to it.
- **Live with it and fix the specific problem.** Usually the better call. A single
  broken application or driver is a narrower problem than reinstalling Windows, and
  vendors ship compatibility fixes within weeks.

## What survives a rollback

- **Personal files** in your user folders — kept.
- **Applications installed before the upgrade** — kept.
- **Applications installed after the upgrade** — usually need reinstalling.
- **Settings changed after the upgrade** — reverted.
- **Passwords** — revert to what they were before the upgrade.

## Stopping it reinstalling immediately

Windows will offer the same feature update again.

1. Go to **Settings > Windows Update > Advanced options**.
2. Set **Pause updates** for as long as it allows.
3. Note the KB number, so you can watch for a fix before resuming.

Do not leave updates paused indefinitely — you stop receiving security fixes too. Pause,
fix the underlying problem, then resume.

## Extending the rollback window

If you are *about* to upgrade and want more than ten days, raise it in advance from an
**elevated** Command Prompt:

\`\`\`
DISM /Online /Set-OSUninstallWindow /Value:30
\`\`\`

The maximum is 60 days. This must be set **after** the upgrade and **before** the
default window expires, and it needs the disk space to keep \`Windows.old\` for longer.
Check the current setting with:

\`\`\`
DISM /Online /Get-OSUninstallWindow
\`\`\``,
    faq: [
      {
        question: 'How long do I have to roll back?',
        answer:
          'About ten days by default. Running Disk Cleanup and removing previous Windows installations ends it immediately, even inside those ten days.',
      },
      {
        question: 'Will rolling back delete my files?',
        answer:
          'No. Personal files are preserved. Applications installed after the upgrade may need reinstalling, and settings changed since the upgrade revert.',
      },
      {
        question: 'The "Go back" button is greyed out. Why?',
        answer:
          'Either the window has expired or the Windows.old folder has been deleted — usually by Disk Cleanup or a disk-space cleanup tool. Without those files there is nothing to restore from.',
      },
      {
        question: 'Can I roll back a monthly update instead?',
        answer:
          'Yes, and it is a different, less disruptive operation: Settings > Windows Update > Update history > Uninstall updates, then select the KB.',
      },
      {
        question: 'Will the same update just install again?',
        answer:
          'Yes, at the next check, unless you pause updates. Pause, resolve whatever broke, then resume — leaving updates paused long-term also blocks security fixes.',
      },
    ],
    sources: [MS_UPDATE_TROUBLESHOOT, MS_UPGRADE_ERRORS],
  },
];
