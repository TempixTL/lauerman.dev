+++
title = 'Hand-making an iOS App (part 2)'
date = 2024-10-07 
+++

In my last post, I walked through the process of building a simple app that
can be run in the simulator using only C, shell scripting, and the Xcode
command-line tools. We learned about cross-compilation, the structure of an
application bundle, and how to use the `simctl` command to automate installing
and launching the app. This is no small feat!

However, we're still a long way from a "real" app. In this post, we'll learn
about entitlements, certificates, and provisioning profiles in order to get our
app running on real hardware.

## The app (again)

In part 1 I mentioned that there are a few different ways to represent
apps on your filesystem. Last time we dealt with `.app`. This time, we're going
to get familiar with another format you might have heard of, `.ipa`.

The `.ipa` is going to be quite simple for this app. For starters, an `.ipa`
is nothing more than a `.zip` file with a different extension. Much of it's
contents are just metadata for the App Store, and we're going to leave that
out. All our `.ipa` will contain is a `Payload` directory which will, in turn
contain our existing `handmade-ios.app`. Pretty easy!

With that in mind, here's the basic `.ipa` structure for the app:

```txt
/handmade-ios.ipa (zipped)
/handmade-ios.ipa/Payload
/handmade-ios.ipa/Payload/handmade-ios.app/
/handmade-ios.ipa/Payload/handmade-ios.app/handmade-ios (binary)
/handmade-ios.ipa/Payload/handmade-ios.app/Info.plist
```

Let's modify our `build.sh` to mirror this:

```sh
#!/bin/sh
# build.sh
set -ex

xcrun -sdk iphonesimulator clang \
    -o handmade-ios.app/handmade-ios \
    main.c

# clean build the .ipa
rm -rf Payload/ handmade-ios.ipa/
mkdir Payload/
cp -r handmade-ios.app Payload/
zip -0yr handmade-ios.ipa Payload/
rm -rf Payload/
```

However, if you try to install this `.ipa` on a real device, you'll certainly
run into some issues. Let's tackle them one at a time.

## Provisioning an app

In order to run code on real iOS devices, you have to jump through some hoops
to prove that you're not doing anything malicious. Every app must be "signed"
by a developer that's registered with an Apple Developer account. If you don't
already have an Apple Developer account, now's the time to create one. For the
purposes of this tutorial (development only, not distribution) making an
account is free.

### Device setup

Go ahead and grab the device you plan to install the app on. Make sure that
[developer mode is enabled][1], and [add this device to your developer
account][2]. This enables the device to be added to a provisioning profile
in a later step.

### Identifiers

An identifier register an app or service with your Apple ID. In this case, we're
going to [create an app ID][3] with a bundle ID of `com.example.handmade-ios`.
The description can be anything you want, and no need to enable any additional
services.

### Certificates

A certificate is digital proof that you're able to develop or distribute code in
certain ways. There's a variety of certificates available, but for this app,
you'll need to [create a standard Apple development certificate][5].

You're going to want to download this certificate and add it to the Keychain
Access app on your Mac. This is where a tool called `codesign` will expect the
certificate to be.

### Provisioning profiles

A provisioning profile basically packages everything we just did altogether in
one file. By including it in our `.ipa`, we're able to tell iOS that this app
is created by us, for this device, for development purposes.

With that said, go ahead and [create a provisioning profile for iOS app
development][4]. Select the app ID, certificate, and device that you set up in the
previous steps. Save the file as `embedded.mobileprovision` and place it in the
`handmade-ios.app` directory.

### Entitlements

An entitlement is a capability that our app has access to. For example, to read
a user's health data the app needs a HealthKit entitlement. We don't need any
special capabilities for our app, but there's one key that's required to install
on real hardware: `application-identifier`.

Go ahead and drop this into `handmade-ios.app/Entitlements.plist`. Make sure
to replace `[YOUR-TEAM-ID]` with your actual team ID, which you can find in the
[Apple Developer portal][6].

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>application-identifier</key>
    <string>[YOUR-TEAM-ID].com.example.handmade-ios</string>
</dict>
</plist>

```
## Code signing

Breathe a sigh of relief, as we're now done interacting with the Apple
Developer portal. The remainder of the tutorial will deal with prepping
our `.ipa` and running it on real hardware!

The last step that's required is "signing" our `.app` and executable, proving
to iOS that we really are the developers. This can be done with the handy
`codesign` command, which takes a few parameters (for our use case):

```sh
codesign -s <YOUR-CERTIFICATE-NAME> --entitlements handmade-ios/Entitlements.plist -f <FILE-TO-SIGN>
```

<!-- TODO: what is the ID in the cert name? -->

`<YOUR-CERTIFICATE-NAME>` should be the name of the development certificate you
added to Keychain Access earlier. If it's anything like mine, it should be
something like `Apple Development: <YOUR-NAME> (<ID>)`. Next, we have to pass
the path to our entitlements. Last, you need to provide the file to sign.
We have to sign `handmade-ios.app` as well as
`handmade-ios.app/handmade-ios`, so we'll invoke the command twice.

Putting it all together, our `build.sh` should now look something like this:

```sh
#!/bin/sh
set -ex

xcrun -sdk iphoneos clang \
    -o handmade-ios.app/handmade-ios \
    main.c

# codeign our app and executable
codesign -s 'Apple Development: <YOUR-NAME> (<ID>)' --entitlements handmade-ios.app/Entitlements.plist -f handmade-ios.app
codesign -s 'Apple Development: <YOUR-NAME> (<ID>)' --entitlements handmade-ios.app/Entitlements.plist -f handmade-ios.app/handmade-ios

# package the app into .ipa
rm -rf Payload/ handmade-ios.ipa/
mkdir Payload/
cp -r handmade-ios.app Payload/
zip -0yr handmade-ios.ipa Payload/
rm -rf Payload/
```

You might have also noticed that I changed the `xcrun` invocation to use the
`iphoneos` SDK rather than `iphonesimulator`. This is required to make sure
that the executable is compiled with the right target triple, and links to
the correct dynamic libraries.

## Running on-device

With that, we finally have a working `.ipa`! It's almost time for the moment of
truth. Before continuing, make sure your iOS device is connected to your Mac.

Similar to `simctl` which we met in part 1, there's another useful
command that allows us to manage our physical devices. Meet the aptly-named
`devicectl`! Although I didn't note it in my last post, it's worth mentioning
that these tools shipped with Xcode 15, and only work with iOS 17 and newer.

To use this command, let's first find the identifier of the device we want to
install our app onto. The way we do that is by running
`xcrun devicectl list devices`. Make note of the identifier, and use it when
running the following commands:

```sh 
xcrun devicectl device install app --device <YOUR-DEVICE-ID> handmade-ios.ipa
xcrun devicectl device process launch --console --device <YOUR-DEVICE-ID> com.example.handmade-ios
```

> If you're so inclined, you could even write a script to perform both of these
> commands at once (similar to `run-simulator.sh` from part 1).

If all went well, you should see a black screen (our app) briefly show up on
your device, along with the message "hello world" in your terminal!

## Wrapping up

Although this post may not have been as exciting of a step-by-step as the last,
I hope you'll see the value in the end result. By pushing through all the
Developer Portal boilerplate we have a real, *artisanal* app running on our
physical device! Every bit has been hand-crafted by us, and even Apple cannot
deny the correctness of the final product.

### Additional exercies

For your reference, [here](https://github.com/tommylau-exe/handmade-ios/tree/part-2) is the source for the code you should have by the
end of this tutorial.

If you haven't checked out [the exercises from part 1](https://lauerman.dev/posts/handmade-ios-part-1/#additional-exercises), it would be a fun
idea to combine them with the steps from this blog post. I've repeated them
here and linked solutions which can run on real hardware, but note that you'll
have to provide your own provisioning profile, certificate, device ID and team
ID to try them out.

1. Show a UIKit component. [Solution][uikit-solution]
2. Compile a Swift program rather than C or Objective-C. [Solution][swift-solution]
3. Show a SwiftUI view. [Solution][swiftui-solution]

[1]: https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device#
[2]: https://developer.apple.com/account/resources/devices/list
[3]: https://developer.apple.com/account/resources/identifiers/list
[4]: https://developer.apple.com/account/resources/profiles/list
[5]: https://developer.apple.com/account/resources/certificates/list
[6]: https://developer.apple.com/account#MembershipDetailsCard
[uikit-solution]: https://github.com/tommylau-exe/handmade-ios/tree/part-2.uikit
[swift-solution]: https://github.com/tommylau-exe/handmade-ios/tree/part-2.swift
[swiftui-solution]: https://github.com/tommylau-exe/handmade-ios/tree/part-2.swiftui
