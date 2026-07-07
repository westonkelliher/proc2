# model_tools — implement build agent ONLY

Not general-purpose tools. The file tools operate solely on GRIM_IMPL_FILE
(the one module implementation being built) — nothing else is readable or
writable. Submit/BuildErrors end the build.
