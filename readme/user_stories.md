
# User Stories 

## Note

### PC vs Phone
- the use case on desktop is quite different than the use case on phone. Therefore we should have a completely different frontend for each, likely with most frontend source being in two separate dirs for the two separate frontends.

## Communication of information
- always prefer communicating information via shapes and/or colors as opposed to via text.
  - e.g. 
- sometimes text+shape&|color is appropriate


## Most Common User Stories

## Phone

### Purpose
When I interact with proc2 on the phone I am usually quickly writing down a task that I can't forget or a new idea I don't want to forget. 
It should enable me to be a better personal assistant for myself.
It should enable me to avoid having things fall through the cracks.
It should enable me to reduce anxiety associated with yucky tasks that are hanging over my head (e.g. doing taxes) by allowing me to quickly write it down as soon as I think of it, and be confident that I can stop thinking about the thing immediately and it will still be guaranteed to get done by the time it needs to be done by and is guaranteed to not fall through the cracks.

### Story 1
I think, "I need to wash my car tomorrow" so I open weston.pub in chrome on my phone. There I tap [New Task] which takes me to the new task UI. I select tomorrows date list by simply tapping it (it's one of about 4 lists that are readily available to select without effort); I type "wash car"; I set reminder trigger to 10:30am tomorrow; I press [Transient] to set transient to true; and I press [Create].
The next day at 10:30 the alarm goes off on my phone. I press [Defer for: [one hour]] because I'm not ready to leave the house yet. next time it goes off I press [Defer for: [5 minutes]]. Next time it goes off I am already on my way to the wash so I press [Mark Completed]. Since the task is "transient" it will not be shown to my by default when I go review what I did each day that week a few days later.

### Story 2
I think of an idea for a new project. <TODO>

### Story 3
I think of an idea for some feature on an existing project. <TODO>

### Story 4
I think of something profound that I want to be reminded of in the future. <TODO>

### Story 5
I think of something with a due date. (reminders should be created by default on this one) <TODO>

### Story 6 
I think of something and I don't know when it should be done and don't have time to think about it currently. <TODO>





## PC

### Purpose
When I interact with proc2 on my PC it will be open at all times as an accompanyment to the work that I am doing for that day. The usage of proc2 on PC directly reflects the way I currently use proc/proc and proc/overviews.
Proc2 will additionally be used for project initiation and used for project management in the course of developing the project.

### Details
* Much like having proc/proc open in emacs, I interact with proc2 entirely through hot keys and typing.
* In addition to emacs style navigation hotkeys, there are also hotkeys to mark the current task as done (and therefore the next undone task becomes the highlighted one).


### Story 1
I start my PC for the day and the first thing I do is open proc2. There it shows me 3 task lists: "staging", today's date list, yesterday's date list. This reflects how the proc/proc file is currently used. The first task in today's list (at the top) is highlighted indicating that's what I should work on first.